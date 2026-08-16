import { Pressable, Share, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CATEGORY_BY_ID } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ShoppingItem } from '@/types/shopping';

interface ShareListButtonProps {
  homeName: string;
  items: ShoppingItem[];
}

function buildMessage(homeName: string, items: ShoppingItem[]) {
  const pending = items.filter((item) => !item.done);
  if (pending.length === 0) return `${homeName} shopping list is all done! 🎉`;

  const byCategory = new Map<string, ShoppingItem[]>();
  for (const item of pending) {
    const label = CATEGORY_BY_ID[item.category].label;
    byCategory.set(label, [...(byCategory.get(label) ?? []), item]);
  }

  const sections = Array.from(byCategory.entries()).map(([label, categoryItems]) => {
    const lines = categoryItems.map((item) => {
      const metric = [item.quantity, item.unit].filter(Boolean).join(' ');
      return `• ${item.name}${metric ? ` (${metric})` : ''}`;
    });
    return `${label}\n${lines.join('\n')}`;
  });

  return `${homeName} shopping list\n\n${sections.join('\n\n')}`;
}

export function ShareListButton({ homeName, items }: ShareListButtonProps) {
  const theme = useTheme();

  const share = () => {
    Share.share({ message: buildMessage(homeName, items) });
  };

  return (
    <Pressable
      onPress={share}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold">Share</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
});
