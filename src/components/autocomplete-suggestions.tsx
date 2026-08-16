import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CATEGORY_BY_ID } from '@/constants/categories';
import { CommonItem } from '@/constants/common-items';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface AutocompleteSuggestionsProps {
  suggestions: CommonItem[];
  onSelect: (item: CommonItem) => void;
}

export function AutocompleteSuggestions({ suggestions, onSelect }: AutocompleteSuggestionsProps) {
  const theme = useTheme();
  if (suggestions.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      {suggestions.map((item) => {
        const category = CATEGORY_BY_ID[item.category];
        return (
          <Pressable
            key={item.name}
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
            ]}>
            <View style={[styles.dot, { backgroundColor: category.color }]} />
            <ThemedText style={styles.name}>{item.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.unit}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    flex: 1,
  },
});
