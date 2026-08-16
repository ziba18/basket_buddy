import { CategoryId } from '@/types/shopping';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  color: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'groceries', label: 'Groceries', color: '#4CAF50' },
  { id: 'produce', label: 'Produce', color: '#8BC34A' },
  { id: 'cleaning', label: 'Cleaning', color: '#2196F3' },
  { id: 'household', label: 'Household', color: '#FF9800' },
  { id: 'other', label: 'Other', color: '#9E9E9E' },
];

export const CATEGORY_BY_ID: Record<CategoryId, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category])
) as Record<CategoryId, CategoryMeta>;
