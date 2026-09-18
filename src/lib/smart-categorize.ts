import { COMMON_ITEMS } from '@/constants/common-items';
import { CategoryId } from '@/types/shopping';

// Keyword → category fallback for names that aren't an exact match in
// COMMON_ITEMS (e.g. "chicken thighs" instead of the catalog's "Chicken
// breast"). Checked in order, so more specific lists (produce, cleaning,
// household) come before the broad "groceries" catch-all.
const KEYWORD_CATEGORIES: { category: CategoryId; keywords: string[] }[] = [
  {
    category: 'produce',
    keywords: [
      'apple', 'banana', 'orange', 'grape', 'berry', 'berries', 'melon',
      'lettuce', 'spinach', 'kale', 'tomato', 'onion', 'garlic', 'potato',
      'carrot', 'bell pepper', 'lemon', 'lime', 'avocado', 'cucumber',
      'broccoli', 'cauliflower', 'mushroom', 'zucchini', 'squash', 'herbs',
      'cilantro', 'parsley', 'basil', 'fruit', 'vegetable', 'veggies',
    ],
  },
  {
    category: 'cleaning',
    keywords: [
      'soap', 'detergent', 'bleach', 'cleaner', 'sponge', 'scrub',
      'disinfect', 'trash bag', 'garbage bag', 'mop', 'broom', 'fabric softener',
    ],
  },
  {
    category: 'household',
    keywords: [
      'toilet paper', 'paper towel', 'tissue', 'napkin', 'shampoo', 'conditioner',
      'toothpaste', 'toothbrush', 'deodorant', 'razor', 'battery', 'batteries',
      'light bulb', 'bulb', 'candle', 'foil', 'ziploc', 'air freshener', 'cotton',
    ],
  },
  {
    category: 'groceries',
    keywords: [
      'milk', 'egg', 'bread', 'cheese', 'yogurt', 'rice', 'pasta', 'cereal',
      'coffee', 'tea', 'sugar', 'flour', 'oil', 'chicken', 'beef', 'pork',
      'fish', 'shrimp', 'bacon', 'tofu', 'juice', 'water', 'snack', 'chip',
      'pizza', 'ice cream', 'soda', 'beer', 'wine', 'sauce', 'soup', 'spice',
      'salt', 'nut', 'cracker', 'butter', 'cream',
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
