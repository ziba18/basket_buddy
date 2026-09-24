import { CategoryId } from '@/types/shopping';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  color: string;
}

// Ordered like a typical walk through a supermarket (fresh produce by the
// entrance, frozen near the tills, non-food at the end) — the List tab's
// "Category" sort groups items in exactly this order so a shop is one pass
// through the store instead of doubling back between aisles.
export const CATEGORIES: CategoryMeta[] = [
  { id: 'produce', label: 'Fruit & Veg', color: '#7CB342' },
  { id: 'bakery', label: 'Bakery', color: '#C68B59' },
  { id: 'meat', label: 'Meat & Fish', color: '#E57373' },
  { id: 'dairy', label: 'Dairy & Eggs', color: '#64B5F6' },
  { id: 'pantry', label: 'Pantry', color: '#FFB74D' },
  { id: 'frozen', label: 'Frozen', color: '#4DD0E1' },
  { id: 'drinks', label: 'Drinks', color: '#BA68C8' },
  { id: 'snacks', label: 'Snacks', color: '#F06292' },
  { id: 'household', label: 'Household', color: '#FF8A65' },
  { id: 'cleaning', label: 'Cleaning', color: '#4FC3F7' },
  { id: 'other', label: 'Other', color: '#9E9E9E' },
];

export const CATEGORY_BY_ID: Record<CategoryId, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category])
) as Record<CategoryId, CategoryMeta>;

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && value in CATEGORY_BY_ID;
}
