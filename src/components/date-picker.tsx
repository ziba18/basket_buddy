import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { isSameDay, MonthCalendar } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DAY = 24 * 60 * 60 * 1000;

interface DatePickerProps {
  value: number;
  onChange: (timestamp: number) => void;
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatShort(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Replaces a plain "Today / Yesterday" toggle with an actual calendar so a
// purchase can be logged against any past date, not just the last two days.
export function DatePicker({ value, onChange }: DatePickerProps) {
  const theme = useTheme();
  const selected = startOfDay(value);
  // Snapshotting "now" via a lazy initializer (called once, on mount) keeps
  // this pure for React Compiler's render-purity check — a bare `Date.now()`
  // call in the render body is flagged as impure.
  const [today] = useState(() => startOfDay(Date.now()));
  const [yesterday] = useState(() => startOfDay(Date.now() - DAY));

  const isToday = isSameDay(selected, today);
  const isYesterday = isSameDay(selected, yesterday);
  const isOther = !isToday && !isYesterday;

  const [showCalendar, setShowCalendar] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));

  const pick = (date: Date) => {
    onChange(date.getTime());
    setShowCalendar(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.chipRow}>
        <Pressable
          onPress={() => {
            setShowCalendar(false);
            onChange(today.getTime());
          }}
          style={[styles.chip, { backgroundColor: isToday ? theme.text : theme.backgroundElement }]}>
          <ThemedText type="small" themeColor={isToday ? 'background' : 'text'}>
            Today
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => {
            setShowCalendar(false);
            onChange(yesterday.getTime());
          }}
          style={[styles.chip, { backgroundColor: isYesterday ? theme.text : theme.backgroundElement }]}>
          <ThemedText type="small" themeColor={isYesterday ? 'background' : 'text'}>
            Yesterday
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setShowCalendar((prev) => !prev)}
          style={[styles.chip, { backgroundColor: isOther || showCalendar ? theme.text : theme.backgroundElement }]}>
          <ThemedText type="small" themeColor={isOther || showCalendar ? 'background' : 'text'}>
            {isOther ? formatShort(selected) : 'Pick a date'}
          </ThemedText>
        </Pressable>
      </View>

      {showCalendar ? (
        <MonthCalendar
          month={visibleMonth}
          onChangeMonth={setVisibleMonth}
          selected={selected}
          onSelect={pick}
          today={today}
          maxDate={today}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
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
});
