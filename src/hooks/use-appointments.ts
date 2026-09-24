import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { resolveAppointmentKind } from '@/constants/appointment-kinds';
import { useHome } from '@/hooks/use-home';
import { readCache, writeCache } from '@/lib/local-cache';
import { supabase } from '@/lib/supabase';
import { Appointment, AppointmentDraft } from '@/types/shopping';

const cacheKey = (homeId: string) => `cache:appointments:${homeId}`;

async function fetchAppointments(homeId: string): Promise<Appointment[] | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('home_id', homeId)
    .order('starts_at', { ascending: true });
  // null (not []) on error so a failed fetch doesn't wipe the cached list.
  if (error) return null;
  return (data ?? []).map(fromRow);
}

function fromRow(row: any): Appointment {
  return {
    id: row.id,
    homeId: row.home_id,
    title: row.title,
    kind: resolveAppointmentKind(row.kind),
    startsAt: new Date(row.starts_at).getTime(),
    allDay: row.all_day,
    location: row.location,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function toRow(draft: AppointmentDraft) {
  return {
    title: draft.title.trim(),
    kind: draft.kind,
    starts_at: new Date(draft.startsAt).toISOString(),
    all_day: draft.allDay,
    location: draft.location?.trim() || null,
    notes: draft.notes?.trim() || null,
  };
}

const byStart = (a: Appointment, b: Appointment) => a.startsAt - b.startsAt;

interface AppointmentsContextValue {
  appointments: Appointment[];
  // add/update resolve to an error message (or null on success) so the
  // editor can keep itself open and show what went wrong.
  addAppointment: (draft: AppointmentDraft) => Promise<string | null>;
  updateAppointment: (id: string, draft: AppointmentDraft) => Promise<string | null>;
  deleteAppointment: (id: string) => Promise<void>;
}

const AppointmentsContext = createContext<AppointmentsContextValue | null>(null);

// Provider for the same reason as ShoppingListProvider: one realtime
// channel per Home, shared by every screen that reads appointments.
export function AppointmentsProvider({ children }: { children: React.ReactNode }) {
  const { home } = useHome();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!home) return;
    let isCancelled = false;

    readCache<Appointment[]>(cacheKey(home.id)).then((cached) => {
      if (isCancelled || !cached) return;
      setAppointments(cached);
      setIsLoaded(true);
    });

    fetchAppointments(home.id).then((loaded) => {
      if (isCancelled || !loaded) return;
      setAppointments(loaded);
      setIsLoaded(true);
      writeCache(cacheKey(home.id), loaded);
    });

    return () => {
      isCancelled = true;
    };
  }, [home]);

  useEffect(() => {
    if (!home || !isLoaded) return;
    writeCache(cacheKey(home.id), appointments);
  }, [home, appointments, isLoaded]);

  useEffect(() => {
    if (!home) return;
    const channel = supabase
      .channel(`appointments-${home.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `home_id=eq.${home.id}` },
        (payload) => {
          setAppointments((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((entry) => entry.id !== payload.old.id);
            }
            const next = fromRow(payload.new);
            const others = prev.filter((entry) => entry.id !== next.id);
            return [...others, next].sort(byStart);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [home]);

  const addAppointment = useCallback(
    async (draft: AppointmentDraft) => {
      if (!home) return 'No home selected';
      const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
      const { error } = await supabase
        .from('appointments')
        .insert({ ...toRow(draft), home_id: home.id, created_by: userId });
      return error ? error.message : null;
    },
    [home]
  );

  const updateAppointment = useCallback(async (id: string, draft: AppointmentDraft) => {
    const { error } = await supabase.from('appointments').update(toRow(draft)).eq('id', id);
    return error ? error.message : null;
  }, []);

  const deleteAppointment = useCallback(async (id: string) => {
    await supabase.from('appointments').delete().eq('id', id);
  }, []);

  const value = useMemo<AppointmentsContextValue>(
    () => ({
      appointments: home ? appointments : [],
      addAppointment,
      updateAppointment,
      deleteAppointment,
    }),
    [home, appointments, addAppointment, updateAppointment, deleteAppointment]
  );

  return createElement(AppointmentsContext.Provider, { value }, children);
}

export function useAppointments() {
  const context = useContext(AppointmentsContext);
  if (!context) throw new Error('useAppointments must be used within an AppointmentsProvider');
  return context;
}
