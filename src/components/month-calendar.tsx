import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

interface MonthCalendarProps {
  // Any date inside the month to show.
  month: Date;
  onChangeMonth: (firstOfMonth: Date) => void;
  selected: Date | null;
  onSelect: (date: Date) => void;
  today: Date;
  // When set, days after this (and months past it) can't be picked.
  maxDate?: Date;
  // Dot colors to draw under a day, keyed by `Date#toDateString()`.
  markers?: Map<string, string[]>;
}

// Plain month grid shared by the purchase-date picker and the Calendar tab.
export function MonthCalendar({ month, onChangeMonth, selected, onSelect, today, maxDate, markers }: MonthCalendarProps) {
  const theme = useTheme();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstOfMonth.getDay()).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(year, monthIndex, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const result: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [year, monthIndex]);

  const nextMonth = new Date(year, monthIndex + 1, 1);
  const canGoNextMonth = !maxDate || nextMonth <= maxDate;

  return (
    <View style={[styles.calendar, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.calendarHeader}>
        <Pressable hitSlop={12} onPress={() => onChangeMonth(new Date(year, monthIndex - 1, 1))}>
          <ThemedText type="smallBold">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold">
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </ThemedText>
        <Pressable hitSlop={12} disabled={!canGoNextMonth} onPress={() => onChangeMonth(nextMonth)}>
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
            const isDisabled = !!maxDate && date > maxDate;
            const isPicked = !!selected && isSameDay(date, selected);
            const isToday = isSameDay(date, today);
            const dots = markers?.get(date.toDateString()) ?? [];
            return (
              <Pressable
                key={dayIndex}
                disabled={isDisabled}
                onPress={() => onSelect(date)}
                style={[
                  styles.dayCell,
                  styles.dayButton,
                  isToday && !isPicked && { borderWidth: 1, borderColor: theme.textSecondary },
                  isPicked && { backgroundColor: theme.text },
                ]}>
                <ThemedText
                  type={isToday ? 'smallBold' : 'small'}
                  themeColor={isPicked ? 'background' : isDisabled ? 'textSecondary' : 'text'}
                  style={isDisabled && styles.disabledDay}>
                  {date.getDate()}
                </ThemedText>
                {dots.length > 0 ? (
                  <View style={styles.dotRow}>
                    {dots.slice(0, 3).map((color, index) => (
                      <View key={index} style={[styles.dot, { backgroundColor: color }]} />
                    ))}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
    textAlign: 'center',
  },
  dayButton: {
    borderRadius: 999,
  },
  disabledDay: {
    opacity: 0.4,
  },
  dotRow: {
    position: 'absolute',
    bottom: 3,
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
