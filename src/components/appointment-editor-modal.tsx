import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthCalendar } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APPOINTMENT_KINDS } from '@/constants/appointment-kinds';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/appointment-format';
import { Appointment, AppointmentDraft, AppointmentKind } from '@/types/shopping';

const MINUTE_STEP = 15;

interface AppointmentEditorModalProps {
  // null = closed; `{ appointment }` edits an existing one; `{ day }` starts
  // a new one on that day.
  target: { appointment: Appointment } | { day: Date } | null;
  today: Date;
  onClose: () => void;
  onSave: (draft: AppointmentDraft, existingId: string | null) => Promise<string | null>;
  onDelete: (id: string) => void;
}

function initialStart(target: NonNullable<AppointmentEditorModalProps['target']>) {
  if ('appointment' in target) return new Date(target.appointment.startsAt);
  const start = new Date(target.day);
  start.setHours(9, 0, 0, 0);
  return start;
}

export function AppointmentEditorModal({ target, today, onClose, onSave, onDelete }: AppointmentEditorModalProps) {
  const theme = useTheme();
  // Seeded once per open — the parent remounts this via `key` whenever the
  // target changes, so no effect is needed to sync state from props.
  const existing = target && 'appointment' in target ? target.appointment : null;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [kind, setKind] = useState<AppointmentKind>(existing?.kind ?? 'date');
  const [start, setStart] = useState(() => (target ? initialStart(target) : new Date(0)));
  const [allDay, setAllDay] = useState(existing?.allDay ?? false);
  const [location, setLocation] = useState(existing?.location ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(start.getFullYear(), start.getMonth(), 1));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!target) return null;

  const canSave = title.trim().length > 0 && !isSaving;

  const pickDay = (day: Date) => {
    const next = new Date(day);
    next.setHours(start.getHours(), start.getMinutes(), 0, 0);
    setStart(next);
  };

  const shiftMinutes = (delta: number) => {
    const next = new Date(start);
    const minutesOfDay = start.getHours() * 60 + start.getMinutes() + delta;
    // Wrap within the same day so nudging the time never moves the date.
    const wrapped = ((minutesOfDay % 1440) + 1440) % 1440;
    next.setHours(Math.floor(wrapped / 60), wrapped % 60, 0, 0);
    setStart(next);
  };

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    const startsAt = new Date(start);
    if (allDay) startsAt.setHours(0, 0, 0, 0);
    try {
      const failure = await onSave(
        { title, kind, startsAt: startsAt.getTime(), allDay, location: location || null, notes: notes || null },
        existing?.id ?? null
      );
      if (failure) setError(failure);
      else onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save — try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        style={styles.sheetWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none">
        <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
          <ThemedView style={[styles.sheet, { backgroundColor: theme.background }]}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <ThemedText type="subtitle" style={styles.heading}>
                {existing ? 'Edit plan' : 'New plan'}
              </ThemedText>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What's happening? (e.g. Dinner at Nopi)"
                placeholderTextColor={theme.textSecondary}
                style={inputStyle}
                autoFocus={!existing}
              />

              <View style={styles.chipRow}>
                {APPOINTMENT_KINDS.map((option) => {
                  const isActive = option.id === kind;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setKind(option.id)}
                      style={[styles.chip, { backgroundColor: isActive ? option.color : theme.backgroundElement }]}>
                      <ThemedText type="small" style={isActive ? styles.activeChipText : undefined}>
                        {option.emoji} {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <MonthCalendar
                month={visibleMonth}
                onChangeMonth={setVisibleMonth}
                selected={start}
                onSelect={pickDay}
                today={today}
              />

              <View style={styles.timeRow}>
                <Pressable
                  onPress={() => setAllDay((prev) => !prev)}
                  style={[styles.chip, { backgroundColor: allDay ? theme.text : theme.backgroundElement }]}>
                  <ThemedText type="small" themeColor={allDay ? 'background' : 'text'}>
                    All day
                  </ThemedText>
                </Pressable>
                {!allDay ? (
                  <View style={styles.stepper}>
                    <Pressable
                      hitSlop={8}
                      onPress={() => shiftMinutes(-MINUTE_STEP)}
                      style={[styles.stepButton, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="smallBold">−</ThemedText>
                    </Pressable>
                    <ThemedText type="smallBold" style={styles.timeLabel}>
                      {formatTime(start.getTime())}
                    </ThemedText>
                    <Pressable
                      hitSlop={8}
                      onPress={() => shiftMinutes(MINUTE_STEP)}
                      style={[styles.stepButton, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="smallBold">+</ThemedText>
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      onPress={() => shiftMinutes(60)}
                      style={[styles.stepButton, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="small">+1h</ThemedText>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Where (optional)"
                placeholderTextColor={theme.textSecondary}
                style={inputStyle}
              />
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes (optional)"
                placeholderTextColor={theme.textSecondary}
                style={[inputStyle, styles.notes]}
                multiline
              />

              {error ? (
                <ThemedText type="small" style={styles.error}>
                  {error}
                </ThemedText>
              ) : null}

              <View style={styles.actions}>
                <Pressable onPress={onClose} style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold">Cancel</ThemedText>
                </Pressable>
                <Pressable
                  onPress={save}
                  disabled={!canSave}
                  style={[styles.button, { backgroundColor: canSave ? theme.text : theme.backgroundSelected }]}>
                  <ThemedText type="smallBold" themeColor={canSave ? 'background' : 'textSecondary'}>
                    {isSaving ? 'Saving…' : 'Save'}
                  </ThemedText>
                </Pressable>
              </View>

              {existing ? (
                <Pressable
                  onPress={() => {
                    onDelete(existing.id);
                    onClose();
                  }}
                  style={styles.deleteButton}>
                  <ThemedText type="small" style={styles.error}>
                    Delete this plan
                  </ThemedText>
                </Pressable>
              ) : null}
            </ScrollView>
          </ThemedView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  safeArea: {
    width: '100%',
    maxHeight: '92%',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
  },
  input: {
    fontSize: 16,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  notes: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  activeChipText: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepButton: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: Spacing.two,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLabel: {
    minWidth: 72,
    textAlign: 'center',
  },
  error: {
    color: '#E53935',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
