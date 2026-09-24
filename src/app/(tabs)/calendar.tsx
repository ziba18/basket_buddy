import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppointmentEditorModal } from '@/components/appointment-editor-modal';
import { isSameDay, MonthCalendar } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APPOINTMENT_KIND_BY_ID } from '@/constants/appointment-kinds';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppointments } from '@/hooks/use-appointments';
import { useHome } from '@/hooks/use-home';
import { useTheme } from '@/hooks/use-theme';
import { formatDayHeading, formatTime } from '@/lib/appointment-format';
import { Appointment, AppointmentDraft } from '@/types/shopping';

const UPCOMING_LIMIT = 8;

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function AppointmentRow({
  appointment,
  addedBy,
  showDate,
  today,
  onPress,
}: {
  appointment: Appointment;
  addedBy?: string;
  showDate: boolean;
  today: Date;
  onPress: () => void;
}) {
  const theme = useTheme();
  const kind = APPOINTMENT_KIND_BY_ID[appointment.kind];
  const when = [
    showDate ? formatDayHeading(new Date(appointment.startsAt), today) : null,
    appointment.allDay ? 'All day' : formatTime(appointment.startsAt),
  ]
    .filter(Boolean)
    .join(' · ');
  const details = [when, appointment.location, addedBy ? `added by ${addedBy}` : null].filter(Boolean).join(' · ');

  return (
    <Pressable onPress={onPress} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.kindBar, { backgroundColor: kind.color }]} />
      <ThemedText style={styles.kindEmoji}>{kind.emoji}</ThemedText>
      <View style={styles.rowMain}>
        <ThemedText numberOfLines={1}>{appointment.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {details}
        </ThemedText>
        {appointment.notes ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.notes}>
            {appointment.notes}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function CalendarScreen() {
  const theme = useTheme();
  const { members } = useHome();
  const { appointments, addAppointment, updateAppointment, deleteAppointment } = useAppointments();
  const [today] = useState(startOfToday);
  const [selectedDay, setSelectedDay] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [editorTarget, setEditorTarget] = useState<{ appointment: Appointment } | { day: Date } | null>(null);

  const nicknameByUserId = useMemo(
    () => new Map(members.map((member) => [member.userId, member.nickname])),
    [members]
  );

  const markers = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const appointment of appointments) {
      const key = new Date(appointment.startsAt).toDateString();
      map.set(key, [...(map.get(key) ?? []), APPOINTMENT_KIND_BY_ID[appointment.kind].color]);
    }
    return map;
  }, [appointments]);

  const dayAppointments = useMemo(
    () => appointments.filter((entry) => isSameDay(new Date(entry.startsAt), selectedDay)),
    [appointments, selectedDay]
  );

  const upcoming = useMemo(
    () =>
      appointments
        .filter((entry) => entry.startsAt >= today.getTime() && !isSameDay(new Date(entry.startsAt), selectedDay))
        .slice(0, UPCOMING_LIMIT),
    [appointments, today, selectedDay]
  );

  const save = (draft: AppointmentDraft, existingId: string | null) =>
    existingId ? updateAppointment(existingId, draft) : addAppointment(draft);

  const renderRow = (appointment: Appointment, showDate: boolean) => (
    <AppointmentRow
      key={appointment.id}
      appointment={appointment}
      addedBy={appointment.createdBy ? nicknameByUserId.get(appointment.createdBy) : undefined}
      showDate={showDate}
      today={today}
      onPress={() => setEditorTarget({ appointment })}
    />
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <ThemedText type="title" style={styles.title}>
                Calendar
              </ThemedText>
              <Pressable
                onPress={() => setEditorTarget({ day: selectedDay })}
                style={({ pressed }) => [styles.addButton, { backgroundColor: theme.text }, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="background">
                  + Add
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText themeColor="textSecondary">
              Dates, appointments and things to remember — shared with everyone in your home.
            </ThemedText>
          </View>

          <MonthCalendar
            month={visibleMonth}
            onChangeMonth={setVisibleMonth}
            selected={selectedDay}
            onSelect={setSelectedDay}
            today={today}
            markers={markers}
          />

          <View style={styles.section}>
            <ThemedText type="smallBold">{formatDayHeading(selectedDay, today)}</ThemedText>
            {dayAppointments.length > 0 ? (
              dayAppointments.map((appointment) => renderRow(appointment, false))
            ) : (
              <Pressable onPress={() => setEditorTarget({ day: selectedDay })} style={styles.emptyDay}>
                <ThemedText type="small" themeColor="textSecondary">
                  Nothing planned — tap to add something.
                </ThemedText>
              </Pressable>
            )}
          </View>

          {upcoming.length > 0 ? (
            <View style={styles.section}>
              <ThemedText type="smallBold">Coming up</ThemedText>
              {upcoming.map((appointment) => renderRow(appointment, true))}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <AppointmentEditorModal
        key={
          editorTarget
            ? 'appointment' in editorTarget
              ? editorTarget.appointment.id
              : `new-${editorTarget.day.getTime()}`
            : 'none'
        }
        target={editorTarget}
        today={today}
        onClose={() => setEditorTarget(null)}
        onSave={save}
        onDelete={deleteAppointment}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  header: {
    paddingTop: Spacing.three,
    gap: Spacing.half,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  addButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
  section: {
    gap: Spacing.two,
  },
  emptyDay: {
    paddingVertical: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingRight: Spacing.three,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  kindBar: {
    alignSelf: 'stretch',
    width: 4,
  },
  kindEmoji: {
    fontSize: 20,
    lineHeight: 26,
  },
  rowMain: {
    flex: 1,
    gap: Spacing.half,
  },
  notes: {
    fontStyle: 'italic',
  },
});
