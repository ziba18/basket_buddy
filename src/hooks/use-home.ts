import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { readCache, writeCache } from '@/lib/local-cache';
import { supabase } from '@/lib/supabase';
import { Home, HomeMember } from '@/types/shopping';

interface CachedHomeState {
  home: Home | null;
  members: HomeMember[];
}

const cacheKey = (userId: string) => `cache:home:${userId}`;

interface HomeContextValue {
  home: Home | null;
  members: HomeMember[];
  isLoading: boolean;
  createHome: (name: string) => Promise<string | null>;
  joinHome: (inviteCode: string) => Promise<string | null>;
  leaveHome: () => Promise<void>;
}

const HomeContext = createContext<HomeContextValue | null>(null);

function generateInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function fetchMembers(homeId: string): Promise<HomeMember[]> {
  const { data } = await supabase
    .from('home_members')
    .select('user_id, joined_at, profiles ( nickname )')
    .eq('home_id', homeId);

  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    nickname: row.profiles?.nickname ?? 'Unknown',
    joinedAt: new Date(row.joined_at).getTime(),
  }));
}

async function fetchHome(userId: string): Promise<{ home: Home; members: HomeMember[] } | null> {
  const { data: membership } = await supabase
    .from('home_members')
    .select('home_id, homes ( id, name, invite_code )')
    .eq('user_id', userId)
    .maybeSingle();

  const homeRow: any = membership?.homes;
  if (!homeRow) return null;

  const members = await fetchMembers(homeRow.id);
  return { home: { id: homeRow.id, name: homeRow.name, inviteCode: homeRow.invite_code }, members };
}

export function HomeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [home, setHome] = useState<Home | null>(null);
  const [members, setMembers] = useState<HomeMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let isCancelled = false;

    readCache<CachedHomeState>(cacheKey(userId)).then((cached) => {
      if (isCancelled || !cached) return;
      setHome(cached.home);
      setMembers(cached.members);
      setIsLoading(false);
    });

    fetchHome(userId).then((result) => {
      if (isCancelled) return;
      const resolved: CachedHomeState = { home: result?.home ?? null, members: result?.members ?? [] };
      setHome(resolved.home);
      setMembers(resolved.members);
      setIsLoading(false);
      writeCache(cacheKey(userId), resolved);
    });

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    writeCache(cacheKey(userId), { home, members });
  }, [userId, home, members]);

  useEffect(() => {
    if (!home) return;
    const channel = supabase
      .channel(`home-members-${home.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'home_members', filter: `home_id=eq.${home.id}` },
        () => {
          fetchMembers(home.id).then(setMembers);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [home]);

  const createHome = useCallback(
    async (name: string) => {
      if (!userId) return 'Not signed in';
      const trimmed = name.trim();
      if (!trimmed) return 'Give your home a name';

      const inviteCode = generateInviteCode();
      const { data, error } = await supabase
        .from('homes')
        .insert({ name: trimmed, invite_code: inviteCode, created_by: userId })
        .select('id, name, invite_code')
        .single();
      if (error || !data) return error?.message ?? 'Could not create home';

      const { error: memberError } = await supabase
        .from('home_members')
        .insert({ home_id: data.id, user_id: userId });
      if (memberError) return memberError.message;

      setHome({ id: data.id, name: data.name, inviteCode: data.invite_code });
      setMembers(await fetchMembers(data.id));
      return null;
    },
    [userId]
  );

  const joinHome = useCallback(
    async (inviteCode: string) => {
      if (!userId) return 'Not signed in';
      const trimmed = inviteCode.trim().toUpperCase();
      if (!trimmed) return 'Enter an invite code';

      const { data: homeRow, error: lookupError } = await supabase
        .from('homes')
        .select('id, name, invite_code')
        .eq('invite_code', trimmed)
        .maybeSingle();
      if (lookupError) return lookupError.message;
      if (!homeRow) return "That code doesn't match any home";

      const { error: memberError } = await supabase
        .from('home_members')
        .insert({ home_id: homeRow.id, user_id: userId });
      if (memberError) return memberError.message;

      setHome({ id: homeRow.id, name: homeRow.name, inviteCode: homeRow.invite_code });
      setMembers(await fetchMembers(homeRow.id));
      return null;
    },
    [userId]
  );

  const leaveHome = useCallback(async () => {
    if (!userId || !home) return;
    await supabase.from('home_members').delete().eq('home_id', home.id).eq('user_id', userId);
    setHome(null);
    setMembers([]);
  }, [userId, home]);

  const value = useMemo<HomeContextValue>(
    () => ({
      home: userId ? home : null,
      members: userId ? members : [],
      isLoading,
      createHome,
      joinHome,
      leaveHome,
    }),
    [userId, home, members, isLoading, createHome, joinHome, leaveHome]
  );

  return createElement(HomeContext.Provider, { value }, children);
}

export function useHome() {
  const context = useContext(HomeContext);
  if (!context) throw new Error('useHome must be used within a HomeProvider');
  return context;
}
