import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CategoryMeta } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CategoryId } from '@/types/shopping';

interface CategoryPickerProps {
  categories: CategoryMeta[];
  selectedId: CategoryId | null;
  onSelect: (id: CategoryId) => void;
}

export function CategoryPicker({ categories, selectedId, onSelect }: CategoryPickerProps) {
  const theme = useTheme();

  return (
    // Horizontal scroller rather than a wrapping row — there are enough
    // store-aisle categories that wrapping would eat three lines of the
    // add-item form.
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}>
      {categories.map((category) => {
        const isSelected = category.id === selectedId;
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category.id)}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <View
              style={[
                styles.chip,
                { backgroundColor: isSelected ? category.color : theme.backgroundElement },
              ]}>
              <View style={[styles.dot, { backgroundColor: isSelected ? '#fff' : category.color }]} />
              <ThemedText
                type="small"
                themeColor={isSelected ? undefined : 'textSecondary'}
                style={isSelected && styles.selectedLabel}>
                {category.label}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.five,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedLabel: {
    color: '#fff',
  },
  pressed: {
    opacity: 0.7,
  },
});
