import { isCategoryId } from '@/constants/categories';
import { COMMON_ITEMS } from '@/constants/common-items';
import { CategoryId } from '@/types/shopping';

// Keyword → category fallback for names that aren't an exact match in
// COMMON_ITEMS (e.g. "chicken thighs" instead of the catalog's "Chicken
// breast"). Checked in order, so more specific phrases ("ice cream",
// "peanut butter", "paper towel") are matched before the single words they
// contain ("cream", "butter", "towel") would send them somewhere else.
const KEYWORD_CATEGORIES: { category: CategoryId; keywords: string[] }[] = [
  { category: 'frozen', keywords: ['frozen', 'ice cream', 'ice lolly', 'popsicle', 'fish fingers'] },
  { category: 'pantry', keywords: ['peanut butter', 'coconut milk', 'canned', 'tinned'] },
  {
    category: 'household',
    keywords: [
      'toilet paper', 'paper towel', 'tissue', 'napkin', 'shampoo', 'conditioner',
      'toothpaste', 'toothbrush', 'deodorant', 'razor', 'battery', 'batteries',
      'light bulb', 'bulb', 'candle', 'foil', 'cling film', 'ziploc', 'cotton',
      'hand soap', 'body wash', 'nappies', 'diapers', 'wipes',
    ],
  },
  {
    category: 'cleaning',
    keywords: [
      'soap', 'detergent', 'bleach', 'cleaner', 'sponge', 'scrub', 'disinfect',
      'trash bag', 'bin bag', 'garbage bag', 'mop', 'broom', 'fabric softener',
      'air freshener', 'dishwasher',
    ],
  },
  {
    category: 'produce',
    keywords: [
      'apple', 'banana', 'orange', 'grape', 'berry', 'berries', 'melon', 'mango',
      'pear', 'peach', 'plum', 'kiwi', 'pineapple', 'lettuce', 'spinach', 'kale',
      'tomato', 'onion', 'garlic', 'potato', 'carrot', 'pepper', 'lemon', 'lime',
      'avocado', 'cucumber', 'broccoli', 'cauliflower', 'mushroom', 'zucchini',
      'courgette', 'eggplant', 'aubergine', 'squash', 'celery', 'ginger', 'herbs', 'cilantro', 'coriander',
      'parsley', 'basil', 'mint', 'salad', 'fruit', 'vegetable', 'veggies', 'veg',
    ],
  },
  {
    category: 'bakery',
    keywords: ['bread', 'bagel', 'croissant', 'bun', 'roll', 'baguette', 'tortilla', 'wrap', 'pitta', 'pita', 'muffin', 'cake', 'pastry', 'sourdough'],
  },
  {
    category: 'meat',
    keywords: [
      'chicken', 'beef', 'pork', 'lamb', 'turkey', 'mince', 'steak', 'bacon',
      'sausage', 'ham', 'salami', 'fish', 'salmon', 'tuna', 'cod', 'shrimp',
      'prawn', 'meat',
    ],
  },
  {
    category: 'dairy',
    keywords: ['milk', 'egg', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'tofu', 'hummus'],
  },
  {
    category: 'drinks',
    keywords: ['juice', 'water', 'soda', 'cola', 'coke', 'lemonade', 'beer', 'wine', 'cider', 'prosecco', 'vodka', 'gin', 'whisky', 'drink'],
  },
  {
    category: 'snacks',
    keywords: ['snack', 'chip', 'crisp', 'chocolate', 'candy', 'sweets', 'cookie', 'biscuit', 'cracker', 'popcorn', 'nuts', 'pretzel'],
  },
  {
    category: 'pantry',
    keywords: [
      'rice', 'pasta', 'noodle', 'cereal', 'oats', 'coffee', 'tea', 'sugar',
      'flour', 'oil', 'vinegar', 'sauce', 'ketchup', 'mayo', 'mustard', 'soup',
      'spice', 'salt', 'honey', 'jam', 'beans', 'lentil', 'stock', 'can',
    ],
  },
];

// Exact catalog match first (case-insensitive), then a keyword sweep for
// anything the curated list doesn't cover. Returns null (leave the current
// category alone) when nothing matches, rather than guessing wrong.
export function guessCategory(name: string): CategoryId | null {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return null;

  const exact = COMMON_ITEMS.find((item) => item.name.toLowerCase() === trimmed);
  if (exact) return exact.category;

  for (const { category, keywords } of KEYWORD_CATEGORIES) {
    if (keywords.some((keyword) => trimmed.includes(keyword))) return category;
  }

  return null;
}

// Rows written before the store-aisle categories existed (the old catch-all
// "groceries", or anything else unrecognized) are re-guessed from the item
// name on read, so they land in a real aisle instead of crashing the
// CATEGORY_BY_ID lookup.
export function resolveCategory(raw: unknown, name: string): CategoryId {
  if (isCategoryId(raw)) return raw;
  return guessCategory(name) ?? 'other';
}
