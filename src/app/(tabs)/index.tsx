import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddItemForm } from '@/components/add-item-form';
import { EditItemModal } from '@/components/edit-item-modal';
import { ShareListButton } from '@/components/share-list-button';
import { ShoppingItemRow } from '@/components/shopping-item-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useHome } from '@/hooks/use-home';
import { useShoppingList } from '@/hooks/use-shopping-list';
import { useTheme } from '@/hooks/use-theme';
import { buildListSections, ListSection } from '@/lib/list-sections';
import { readCache, writeCache } from '@/lib/local-cache';
import { ListSortMode, ShoppingItem } from '@/types/shopping';

// Per-device preference (not per-Home or synced): how someone likes to
// scan the list is personal, and housemates can each pick their own.
const SORT_CACHE_KEY = 'pref:list-sort';

const SORT_OPTIONS: { mode: ListSortMode; label: string }[] = [
  { mode: 'category', label: 'Aisle' },
  { mode: 'addedBy', label: 'Person' },
  { mode: 'date', label: 'Date added' },
];

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export default function ListScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { home, members } = useHome();
  const { items, addItem, updateItem, toggleItem, deleteItem, clearDone } = useShoppingList();
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [sortMode, setSortMode] = useState<ListSortMode>('category');
  // Lazy initializer keeps render pure for the React Compiler.
  const [todayStart] = useState(startOfToday);

  useEffect(() => {
    readCache<ListSortMode>(SORT_CACHE_KEY).then((saved) => {
      if (saved && SORT_OPTIONS.some((option) => option.mode === saved)) setSortMode(saved);
    });
  }, []);

  const changeSortMode = (mode: ListSortMode) => {
    setSortMode(mode);
    writeCache(SORT_CACHE_KEY, mode);
  };

  const nicknameByUserId = useMemo(
    () => new Map(members.map((member) => [member.userId, member.nickname])),
    [members]
  );

  const myUserId = session?.user.id ?? null;
  const sections = useMemo(
    () => buildListSections(items, sortMode, { nicknameByUserId, myUserId, todayStart }),
    [items, sortMode, nicknameByUserId, myUserId, todayStart]
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

          {items.length > 0 ? (
            <View style={styles.sortRow}>
              <ThemedText type="small" themeColor="textSecondary">
                Sort by
              </ThemedText>
              {SORT_OPTIONS.map((option) => {
                const isActive = option.mode === sortMode;
                return (
                  <Pressable
                    key={option.mode}
                    onPress={() => changeSortMode(option.mode)}
                    style={[styles.sortChip, { backgroundColor: isActive ? theme.text : theme.backgroundElement }]}>
                    <ThemedText type="small" themeColor={isActive ? 'background' : 'text'}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <SectionList<ShoppingItem, ListSection>
            sections={sections}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            ItemSeparatorComponent={() => <ThemedView style={styles.separator} />}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                {section.color ? <View style={[styles.sectionDot, { backgroundColor: section.color }]} /> : null}
                <ThemedText type="smallBold">{section.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {section.data.length}
                </ThemedText>
              </View>
            )}
            renderItem={({ item }) => (
              <ShoppingItemRow
                item={item}
                addedByNickname={item.addedBy ? nicknameByUserId.get(item.addedBy) : undefined}
                onToggle={toggleItem}
                onDelete={deleteItem}
                onEdit={setEditingItem}
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

      <EditItemModal
        key={editingItem?.id ?? 'none'}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={updateItem}
      />
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
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  sortChip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
