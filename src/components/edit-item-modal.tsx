import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryPicker } from '@/components/category-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CATEGORIES } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { guessCategory } from '@/lib/smart-categorize';
import { CategoryId, ItemEdits, ShoppingItem } from '@/types/shopping';

interface EditItemModalProps {
  item: ShoppingItem | null;
  onClose: () => void;
  onSave: (id: string, edits: ItemEdits) => void;
}

export function EditItemModal({ item, onClose, onSave }: EditItemModalProps) {
  const theme = useTheme();
  // `item` only changes while the modal is closed (the parent remounts this
  // component via a `key` on the item id), so it's safe to seed state from
  // it directly instead of syncing with an effect.
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState<CategoryId>(item?.category ?? 'groceries');
  const [unit, setUnit] = useState(item?.unit ?? '');
  const [quantity, setQuantity] = useState(item?.quantity ?? '');
  const [isCategoryManual, setIsCategoryManual] = useState(true);

  if (!item) return null;

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0;

  const handleNameChange = (text: string) => {
    setName(text);
    if (!isCategoryManual) {
      const guessed = guessCategory(text);
      if (guessed) setCategory(guessed);
    }
  };

  const save = () => {
    if (!canSave) return;
    onSave(item.id, { name, category, unit: unit || null, quantity: quantity || null });
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        style={styles.sheetWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none">
        <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
          <ThemedView style={[styles.sheet, { backgroundColor: theme.background }]}>
            <ThemedText type="subtitle" style={styles.heading}>
              Edit item
            </ThemedText>

            <View style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary">
                Name
              </ThemedText>
              <TextInput
                value={name}
                onChangeText={handleNameChange}
                placeholder="Item name"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                autoFocus
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.section, styles.qtyFlex]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Qty
                </ThemedText>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="Qty"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
              </View>
              <View style={[styles.section, styles.flex1]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Unit
                </ThemedText>
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="e.g. liters"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary">
                Category
              </ThemedText>
              <CategoryPicker
                categories={CATEGORIES}
                selectedId={category}
                onSelect={(id) => {
                  setCategory(id);
                  setIsCategoryManual(true);
                }}
              />
            </View>

            <View style={styles.actions}>
              <Pressable onPress={onClose} style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={!canSave}
                style={[styles.button, { backgroundColor: canSave ? theme.text : theme.backgroundSelected }]}>
                <ThemedText type="smallBold" themeColor={canSave ? 'background' : 'textSecondary'}>
                  Save
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
  safeArea: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
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
  qtyFlex: {
    width: 88,
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
