import { useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddItemForm } from '@/components/add-item-form';
import { ShareListButton } from '@/components/share-list-button';
import { ShoppingItemRow } from '@/components/shopping-item-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useHome } from '@/hooks/use-home';
import { useShoppingList } from '@/hooks/use-shopping-list';
import { ShoppingItem } from '@/types/shopping';

export default function ListScreen() {
  const { home, members } = useHome();
  const { items, addItem, toggleItem, deleteItem, clearDone } = useShoppingList();

  const nicknameByUserId = useMemo(
    () => new Map(members.map((member) => [member.userId, member.nickname])),
    [members]
  );

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => Number(a.done) - Number(b.done)),
    [items]
  );

  const remainingCount = items.filter((item) => !item.done).length;
  const hasDoneItems = items.some((item) => item.done);

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flexRow}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.header}>
            <ThemedView style={styles.headerTop}>
              <ThemedText type="title" style={styles.title}>
                {home?.name ?? 'Shopping List'}
              </ThemedText>
              <ShareListButton homeName={home?.name ?? 'Shopping List'} items={items} />
            </ThemedView>
            <ThemedText themeColor="textSecondary">
              {remainingCount === 0 ? 'All done!' : `${remainingCount} item${remainingCount === 1 ? '' : 's'} left`}
            </ThemedText>
          </ThemedView>

          <AddItemForm onAdd={addItem} />

          <FlatList<ShoppingItem>
            data={sortedItems}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <ThemedView style={styles.separator} />}
            renderItem={({ item }) => (
              <ShoppingItemRow
                item={item}
                addedByNickname={item.addedBy ? nicknameByUserId.get(item.addedBy) : undefined}
                onToggle={toggleItem}
                onDelete={deleteItem}
              />
            )}
            ListEmptyComponent={
              <ThemedView style={styles.emptyState}>
                <ThemedText themeColor="textSecondary">
                  Nothing on the list yet — add what you need above.
                </ThemedText>
              </ThemedView>
            }
            ListFooterComponent={
              hasDoneItems ? (
                <Pressable onPress={clearDone} style={styles.clearButton}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Clear checked items
                  </ThemedText>
                </Pressable>
              ) : null
            }
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    flexShrink: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: BottomTabInset + Spacing.four,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.two,
    backgroundColor: 'transparent',
  },
  emptyState: {
    paddingTop: Spacing.six,
    alignItems: 'center',
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
});
