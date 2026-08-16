import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AutocompleteSuggestions } from '@/components/autocomplete-suggestions';
import { CategoryPicker } from '@/components/category-picker';
import { ThemedText } from '@/components/themed-text';
import { CATEGORIES } from '@/constants/categories';
import { CommonItem, searchCommonItems } from '@/constants/common-items';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CategoryId } from '@/types/shopping';

interface AddItemFormProps {
  onAdd: (name: string, category: CategoryId, unit: string | null, quantity: string | null) => void;
}

export function AddItemForm({ onAdd }: AddItemFormProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryId>('groceries');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0;

  const suggestions = useMemo(() => (isEditingName ? searchCommonItems(name) : []), [name, isEditingName]);
  const showSuggestions =
    suggestions.length > 0 && !suggestions.some((item) => item.name.toLowerCase() === trimmedName.toLowerCase());

  const applySuggestion = (item: CommonItem) => {
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setIsEditingName(false);
  };

  const submit = () => {
    if (!canSubmit) return;
    onAdd(name, category, unit, quantity);
    setName('');
    setUnit('');
    setQuantity('');
    setIsEditingName(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.inputRow}>
        <TextInput
          value={name}
          onChangeText={(text) => {
            setName(text);
            setIsEditingName(true);
          }}
          onFocus={() => setIsEditingName(true)}
          placeholder="Add something to the list..."
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.accent }]}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: canSubmit ? theme.text : theme.backgroundSelected },
            pressed && canSubmit && styles.pressed,
          ]}>
          <ThemedText
            type="smallBold"
            themeColor={canSubmit ? 'background' : 'textSecondary'}>
            Add
          </ThemedText>
        </Pressable>
      </View>

      {showSuggestions && (
        <AutocompleteSuggestions suggestions={suggestions} onSelect={applySuggestion} />
      )}

      <View style={styles.metricsRow}>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Qty"
          placeholderTextColor={theme.textSecondary}
          style={[styles.metricInput, styles.quantityInput, { color: theme.text, backgroundColor: theme.backgroundSelected }]}
          keyboardType="numbers-and-punctuation"
        />
        <TextInput
          value={unit}
          onChangeText={setUnit}
          placeholder="Unit (e.g. liters)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.metricInput, styles.unitInput, { color: theme.text, backgroundColor: theme.backgroundSelected }]}
        />
      </View>

      <CategoryPicker categories={CATEGORIES} selectedId={category} onSelect={setCategory} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  addButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metricInput: {
    fontSize: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  quantityInput: {
    width: 64,
  },
  unitInput: {
    flex: 1,
  },
});
