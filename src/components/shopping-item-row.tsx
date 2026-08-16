import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CATEGORY_BY_ID } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ShoppingItem } from '@/types/shopping';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  addedByNickname?: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ShoppingItemRow({ item, addedByNickname, onToggle, onDelete }: ShoppingItemRowProps) {
  const theme = useTheme();
  const category = CATEGORY_BY_ID[item.category];
  const metric = [item.quantity, item.unit].filter(Boolean).join(' ');

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <Pressable
        onPress={() => onToggle(item.id)}
        hitSlop={8}
        style={[
          styles.checkbox,
          { borderColor: item.done ? category.color : theme.textSecondary },
          item.done && { backgroundColor: category.color },
        ]}>
        {item.done && <ThemedText style={styles.checkmark}>✓</ThemedText>}
      </Pressable>

      <Pressable style={styles.textArea} onPress={() => onToggle(item.id)}>
        <View style={styles.nameRow}>
          <ThemedText
            numberOfLines={1}
            themeColor={item.done ? 'textSecondary' : 'text'}
            style={[styles.name, item.done && styles.doneText]}>
            {item.name}
          </ThemedText>
          {metric ? (
            <ThemedText type="small" themeColor="textSecondary">
              {metric}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.categoryTag}>
          <View style={[styles.dot, { backgroundColor: category.color }]} />
          <ThemedText type="small" themeColor="textSecondary">
            {category.label}
          </ThemedText>
          {addedByNickname ? (
            <ThemedText type="small" themeColor="textSecondary">
              · added by {addedByNickname}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>

      <Pressable onPress={() => onDelete(item.id)} hitSlop={8} style={styles.deleteButton}>
        <ThemedText themeColor="textSecondary" style={styles.deleteGlyph}>
          ×
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 14,
  },
  textArea: {
    flex: 1,
    gap: Spacing.half,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  doneText: {
    textDecorationLine: 'line-through',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deleteButton: {
    padding: Spacing.one,
  },
  deleteGlyph: {
    fontSize: 20,
    lineHeight: 22,
  },
});
