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
  { name: 'Cucumber', category: 'produce', unit: 'pieces' },
  { name: 'Mushrooms', category: 'produce', unit: 'punnets' },

  { name: 'Bread', category: 'bakery', unit: 'loaves' },
  { name: 'Bagels', category: 'bakery', unit: 'packs' },
  { name: 'Croissants', category: 'bakery', unit: 'pieces' },
  { name: 'Tortillas', category: 'bakery', unit: 'packs' },
  { name: 'Pitta bread', category: 'bakery', unit: 'packs' },

  { name: 'Chicken breast', category: 'meat', unit: 'kg' },
  { name: 'Ground beef', category: 'meat', unit: 'kg' },
  { name: 'Bacon', category: 'meat', unit: 'packs' },
  { name: 'Salmon', category: 'meat', unit: 'fillets' },
  { name: 'Sausages', category: 'meat', unit: 'packs' },
  { name: 'Ham', category: 'meat', unit: 'packs' },
  { name: 'Shrimp', category: 'meat', unit: 'bags' },

  { name: 'Milk', category: 'dairy', unit: 'liters' },
  { name: 'Eggs', category: 'dairy', unit: 'dozen' },
  { name: 'Butter', category: 'dairy', unit: 'blocks' },
  { name: 'Cheese', category: 'dairy', unit: 'grams' },
  { name: 'Yogurt', category: 'dairy', unit: 'tubs' },
  { name: 'Cream', category: 'dairy', unit: 'cartons' },
  { name: 'Tofu', category: 'dairy', unit: 'blocks' },

  { name: 'Rice', category: 'pantry', unit: 'kg' },
  { name: 'Pasta', category: 'pantry', unit: 'boxes' },
  { name: 'Cereal', category: 'pantry', unit: 'boxes' },
  { name: 'Coffee', category: 'pantry', unit: 'bags' },
  { name: 'Tea', category: 'pantry', unit: 'boxes' },
  { name: 'Sugar', category: 'pantry', unit: 'kg' },
  { name: 'Flour', category: 'pantry', unit: 'kg' },
  { name: 'Olive oil', category: 'pantry', unit: 'bottles' },
  { name: 'Canned tomatoes', category: 'pantry', unit: 'cans' },
  { name: 'Peanut butter', category: 'pantry', unit: 'jars' },
  { name: 'Honey', category: 'pantry', unit: 'jars' },
  { name: 'Salt', category: 'pantry', unit: 'packs' },

  { name: 'Frozen pizza', category: 'frozen', unit: 'boxes' },
  { name: 'Ice cream', category: 'frozen', unit: 'tubs' },
  { name: 'Frozen peas', category: 'frozen', unit: 'bags' },
  { name: 'Frozen berries', category: 'frozen', unit: 'bags' },

  { name: 'Orange juice', category: 'drinks', unit: 'liters' },
  { name: 'Water bottles', category: 'drinks', unit: 'packs' },
  { name: 'Sparkling water', category: 'drinks', unit: 'bottles' },
  { name: 'Soda', category: 'drinks', unit: 'cans' },
  { name: 'Beer', category: 'drinks', unit: 'packs' },
  { name: 'Wine', category: 'drinks', unit: 'bottles' },

  { name: 'Snack bars', category: 'snacks', unit: 'boxes' },
  { name: 'Chips', category: 'snacks', unit: 'bags' },
  { name: 'Chocolate', category: 'snacks', unit: 'bars' },
  { name: 'Crackers', category: 'snacks', unit: 'boxes' },
  { name: 'Nuts', category: 'snacks', unit: 'bags' },

  { name: 'Dish soap', category: 'cleaning', unit: 'bottles' },
  { name: 'Laundry detergent', category: 'cleaning', unit: 'bottles' },
  { name: 'Sponges', category: 'cleaning', unit: 'packs' },
  { name: 'All-purpose cleaner', category: 'cleaning', unit: 'bottles' },
  { name: 'Trash bags', category: 'cleaning', unit: 'boxes' },
  { name: 'Glass cleaner', category: 'cleaning', unit: 'bottles' },
  { name: 'Bleach', category: 'cleaning', unit: 'bottles' },
  { name: 'Fabric softener', category: 'cleaning', unit: 'bottles' },
  { name: 'Air freshener', category: 'cleaning', unit: 'pieces' },

  { name: 'Toilet paper', category: 'household', unit: 'rolls' },
  { name: 'Paper towels', category: 'household', unit: 'rolls' },
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
