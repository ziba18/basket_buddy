import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DAY = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface DatePickerProps {
  value: number;
  onChange: (timestamp: number) => void;
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
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

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstOfMonth.getDay()).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const result: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [visibleMonth]);

  const canGoNextMonth =
    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1) <= today;

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
        <View style={[styles.calendar, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.calendarHeader}>
            <Pressable
              hitSlop={8}
              onPress={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
              <ThemedText type="smallBold">‹</ThemedText>
            </Pressable>
            <ThemedText type="smallBold">
              {visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </ThemedText>
            <Pressable
              hitSlop={8}
              disabled={!canGoNextMonth}
              onPress={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
              <ThemedText type="smallBold" themeColor={canGoNextMonth ? 'text' : 'textSecondary'}>
                ›
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <ThemedText key={index} type="small" themeColor="textSecondary" style={styles.dayCell}>
                {label}
              </ThemedText>
            ))}
          </View>

          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((date, dayIndex) => {
                if (!date) return <View key={dayIndex} style={styles.dayCell} />;
                const isFuture = date > today;
                const isPicked = isSameDay(date, selected);
                return (
                  <Pressable
                    key={dayIndex}
                    disabled={isFuture}
                    onPress={() => pick(date)}
                    style={[
                      styles.dayCell,
                      styles.dayButton,
                      isPicked && { backgroundColor: theme.text },
                    ]}>
                    <ThemedText
                      type="small"
                      themeColor={isPicked ? 'background' : isFuture ? 'textSecondary' : 'text'}
                      style={isFuture && styles.futureDay}>
                      {date.getDate()}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
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
  calendar: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.one,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    borderRadius: 999,
  },
  futureDay: {
    opacity: 0.4,
  },
});
