import { CategoryId } from '@/types/shopping';

export interface CommonItem {
  name: string;
  category: CategoryId;
  unit: string;
}

// A starter catalog used to power "type ahead" suggestions and to guess a
// sensible default unit for an item. Users can always edit the unit after
// picking a suggestion (or typing their own item from scratch).
export const COMMON_ITEMS: CommonItem[] = [
  { name: 'Milk', category: 'groceries', unit: 'liters' },
  { name: 'Eggs', category: 'groceries', unit: 'dozen' },
  { name: 'Bread', category: 'groceries', unit: 'loaves' },
  { name: 'Butter', category: 'groceries', unit: 'blocks' },
  { name: 'Cheese', category: 'groceries', unit: 'grams' },
  { name: 'Yogurt', category: 'groceries', unit: 'tubs' },
  { name: 'Rice', category: 'groceries', unit: 'kg' },
  { name: 'Pasta', category: 'groceries', unit: 'boxes' },
  { name: 'Cereal', category: 'groceries', unit: 'boxes' },
  { name: 'Coffee', category: 'groceries', unit: 'bags' },
  { name: 'Tea', category: 'groceries', unit: 'boxes' },
  { name: 'Sugar', category: 'groceries', unit: 'kg' },
  { name: 'Flour', category: 'groceries', unit: 'kg' },
  { name: 'Olive oil', category: 'groceries', unit: 'bottles' },
  { name: 'Chicken breast', category: 'groceries', unit: 'kg' },
  { name: 'Ground beef', category: 'groceries', unit: 'kg' },
  { name: 'Bacon', category: 'groceries', unit: 'packs' },
  { name: 'Tofu', category: 'groceries', unit: 'blocks' },
  { name: 'Orange juice', category: 'groceries', unit: 'liters' },
  { name: 'Water bottles', category: 'groceries', unit: 'packs' },
  { name: 'Snack bars', category: 'groceries', unit: 'boxes' },
  { name: 'Chips', category: 'groceries', unit: 'bags' },
  { name: 'Frozen pizza', category: 'groceries', unit: 'boxes' },
  { name: 'Ice cream', category: 'groceries', unit: 'tubs' },

  { name: 'Bananas', category: 'produce', unit: 'bunches' },
  { name: 'Apples', category: 'produce', unit: 'kg' },
  { name: 'Oranges', category: 'produce', unit: 'kg' },
  { name: 'Avocados', category: 'produce', unit: 'pieces' },
  { name: 'Tomatoes', category: 'produce', unit: 'kg' },
  { name: 'Onions', category: 'produce', unit: 'kg' },
  { name: 'Garlic', category: 'produce', unit: 'bulbs' },
  { name: 'Potatoes', category: 'produce', unit: 'kg' },
  { name: 'Carrots', category: 'produce', unit: 'kg' },
  { name: 'Lettuce', category: 'produce', unit: 'heads' },
  { name: 'Spinach', category: 'produce', unit: 'bags' },
  { name: 'Bell peppers', category: 'produce', unit: 'pieces' },
  { name: 'Lemons', category: 'produce', unit: 'pieces' },
  { name: 'Berries', category: 'produce', unit: 'punnets' },

  { name: 'Dish soap', category: 'cleaning', unit: 'bottles' },
  { name: 'Laundry detergent', category: 'cleaning', unit: 'bottles' },
  { name: 'Paper towels', category: 'cleaning', unit: 'rolls' },
  { name: 'Sponges', category: 'cleaning', unit: 'packs' },
  { name: 'All-purpose cleaner', category: 'cleaning', unit: 'bottles' },
  { name: 'Trash bags', category: 'cleaning', unit: 'boxes' },
  { name: 'Glass cleaner', category: 'cleaning', unit: 'bottles' },
  { name: 'Bleach', category: 'cleaning', unit: 'bottles' },
  { name: 'Fabric softener', category: 'cleaning', unit: 'bottles' },
  { name: 'Air freshener', category: 'cleaning', unit: 'pieces' },

  { name: 'Toilet paper', category: 'household', unit: 'rolls' },
  { name: 'Paper napkins', category: 'household', unit: 'packs' },
  { name: 'Light bulbs', category: 'household', unit: 'pieces' },
  { name: 'Batteries', category: 'household', unit: 'packs' },
  { name: 'Hand soap', category: 'household', unit: 'bottles' },
  { name: 'Shampoo', category: 'household', unit: 'bottles' },
  { name: 'Conditioner', category: 'household', unit: 'bottles' },
  { name: 'Toothpaste', category: 'household', unit: 'tubes' },
  { name: 'Aluminum foil', category: 'household', unit: 'rolls' },
  { name: 'Ziploc bags', category: 'household', unit: 'boxes' },
  { name: 'Candles', category: 'household', unit: 'pieces' },
  { name: 'Tissues', category: 'household', unit: 'boxes' },
];

export function searchCommonItems(query: string, limit = 6): CommonItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  return COMMON_ITEMS.filter((item) => item.name.toLowerCase().includes(trimmed)).slice(0, limit);
}
