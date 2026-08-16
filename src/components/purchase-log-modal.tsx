import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { HomeMember, PurchaseDetails, ShoppingItem } from '@/types/shopping';

interface PurchaseLogModalProps {
  item: ShoppingItem | null;
  members: HomeMember[];
  onClose: () => void;
  onSave: (id: string, details: PurchaseDetails) => void;
}

const DAY = 24 * 60 * 60 * 1000;

export function PurchaseLogModal({ item, members, onClose, onSave }: PurchaseLogModalProps) {
  const theme = useTheme();
  // `item` only changes while the modal is closed (the parent remounts this
  // component via a `key` on the item id), so it's safe to seed state from
  // it directly instead of syncing with an effect.
  const [buyerId, setBuyerId] = useState<string | null>(item?.purchasedBy ?? null);
  const [price, setPrice] = useState(item?.purchasedPrice != null ? String(item.purchasedPrice) : '');
  const [location, setLocation] = useState(item?.purchasedLocation ?? '');
  const [preset, setPreset] = useState<'today' | 'yesterday'>(() =>
    item?.purchasedAt != null && Date.now() - item.purchasedAt > DAY / 2 ? 'yesterday' : 'today'
  );

  if (!item) return null;

  const save = () => {
    const parsedPrice = price.trim() ? Number(price.replace(',', '.')) : null;
    onSave(item.id, {
      purchasedBy: buyerId,
      purchasedPrice: parsedPrice != null && !Number.isNaN(parsedPrice) ? parsedPrice : null,
      purchasedAt: preset === 'today' ? Date.now() : Date.now() - DAY,
      purchasedLocation: location.trim() || null,
    });
    onClose();
  };

  const isToday = preset === 'today';
  const isYesterday = preset === 'yesterday';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView style={styles.sheetWrapper} pointerEvents="box-none">
        <ThemedView style={[styles.sheet, { backgroundColor: theme.background }]}>
          <ThemedText type="subtitle" style={styles.itemName}>
            {item.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            All of this is optional — log as much or as little as you want.
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Who bought it?
            </ThemedText>
            <View style={styles.chipRow}>
              {members.map((member) => {
                const selected = buyerId === member.userId;
                return (
                  <Pressable
                    key={member.userId}
                    onPress={() => setBuyerId(selected ? null : member.userId)}
                    style={[
                      styles.chip,
                      { backgroundColor: selected ? theme.text : theme.backgroundElement },
                    ]}>
                    <ThemedText type="small" themeColor={selected ? 'background' : 'text'}>
                      {member.nickname}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              When?
            </ThemedText>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setPreset('today')}
                style={[styles.chip, { backgroundColor: isToday ? theme.text : theme.backgroundElement }]}>
                <ThemedText type="small" themeColor={isToday ? 'background' : 'text'}>
                  Today
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setPreset('yesterday')}
                style={[styles.chip, { backgroundColor: isYesterday ? theme.text : theme.backgroundElement }]}>
                <ThemedText type="small" themeColor={isYesterday ? 'background' : 'text'}>
                  Yesterday
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.section, styles.flex1]}>
              <ThemedText type="small" themeColor="textSecondary">
                Price
              </ThemedText>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
            </View>
            <View style={[styles.section, styles.flex1]}>
              <ThemedText type="small" themeColor="textSecondary">
                Where?
              </ThemedText>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Trader Joe's"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Pressable>
            <Pressable onPress={save} style={[styles.button, { backgroundColor: theme.text }]}>
              <ThemedText type="smallBold" themeColor="background">
                Save
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  itemName: {
    fontSize: 22,
    lineHeight: 28,
  },
  subtitle: {
    marginTop: -Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex1: {
    flex: 1,
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
  input: {
    fontSize: 16,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
