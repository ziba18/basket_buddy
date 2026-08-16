import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PurchaseLogModal } from '@/components/purchase-log-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CATEGORY_BY_ID } from '@/constants/categories';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useHome } from '@/hooks/use-home';
import { useShoppingList } from '@/hooks/use-shopping-list';
import { useTheme } from '@/hooks/use-theme';
import { ShoppingItem } from '@/types/shopping';

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function PurchasedScreen() {
  const theme = useTheme();
  const { members } = useHome();
  const { items, toggleItem, logPurchase } = useShoppingList();
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

  const nicknameByUserId = useMemo(
    () => new Map(members.map((member) => [member.userId, member.nickname])),
    [members]
  );

  const purchasedItems = useMemo(
    () =>
      items
        .filter((item) => item.done)
        .sort((a, b) => (b.purchasedAt ?? b.createdAt) - (a.purchasedAt ?? a.createdAt)),
    [items]
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Purchased
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Tap an item to log who bought it, how much it was, and where.
          </ThemedText>
        </ThemedView>

        <FlatList
          data={purchasedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const category = CATEGORY_BY_ID[item.category];
            const buyer = item.purchasedBy ? nicknameByUserId.get(item.purchasedBy) : undefined;
            const details = [
              buyer,
              item.purchasedPrice != null ? `$${item.purchasedPrice.toFixed(2)}` : undefined,
              item.purchasedLocation ?? undefined,
              item.purchasedAt ? formatDate(item.purchasedAt) : undefined,
            ].filter(Boolean);

            return (
              <Pressable
                onPress={() => setEditingItem(item)}
                style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.rowMain}>
                  <View style={styles.nameLine}>
                    <View style={[styles.dot, { backgroundColor: category.color }]} />
                    <ThemedText style={styles.name}>{item.name}</ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {details.length > 0 ? details.join(' · ') : 'Add details'}
                  </ThemedText>
                </View>
                <Pressable onPress={() => toggleItem(item.id)} hitSlop={8} style={styles.undoButton}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Move back
                  </ThemedText>
                </Pressable>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <ThemedView style={styles.emptyState}>
              <ThemedText themeColor="textSecondary">
                Nothing purchased yet — checked-off items will show up here.
              </ThemedText>
            </ThemedView>
          }
        />
      </SafeAreaView>

      <PurchaseLogModal
        key={editingItem?.id ?? 'none'}
        item={editingItem}
        members={members}
        onClose={() => setEditingItem(null)}
        onSave={logPurchase}
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
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    paddingTop: Spacing.three,
    gap: Spacing.half,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  listContent: {
    paddingBottom: BottomTabInset + Spacing.four,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  rowMain: {
    flex: 1,
    gap: Spacing.half,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    flexShrink: 1,
  },
  undoButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  emptyState: {
    paddingTop: Spacing.six,
    alignItems: 'center',
  },
});
