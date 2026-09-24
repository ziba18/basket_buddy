import { CATEGORIES } from '@/constants/categories';
import { ListSortMode, ShoppingItem } from '@/types/shopping';

export interface ListSection {
  key: string;
  title: string;
  color?: string;
  data: ShoppingItem[];
}

const DAY = 24 * 60 * 60 * 1000;

function dayLabel(timestamp: number, todayStart: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  const start = date.getTime();
  if (start === todayStart) return 'Today';
  if (start === todayStart - DAY) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const newestFirst = (a: ShoppingItem, b: ShoppingItem) => b.createdAt - a.createdAt;
const byName = (a: ShoppingItem, b: ShoppingItem) => a.name.localeCompare(b.name);

// Groups the still-to-buy items into sections for the chosen sort mode;
// checked-off items always go in one trailing "In the basket" section so
// they never break up the aisle order while you're mid-shop.
export function buildListSections(
  items: ShoppingItem[],
  mode: ListSortMode,
  options: { nicknameByUserId: Map<string, string>; myUserId: string | null; todayStart: number }
): ListSection[] {
  const pending = items.filter((item) => !item.done);
  const done = items.filter((item) => item.done).sort(newestFirst);
  let sections: ListSection[];

  if (mode === 'category') {
    sections = CATEGORIES.map((category) => ({
      key: `category:${category.id}`,
      title: category.label,
      color: category.color,
      data: pending.filter((item) => item.category === category.id).sort(byName),
    }));
  } else if (mode === 'addedBy') {
    const rank = (section: ListSection) =>
      section.key === `person:${options.myUserId}` ? 0 : section.title.endsWith('former member') ? 2 : 1;
    const groups = new Map<string, ShoppingItem[]>();
    for (const item of pending) {
      const key = item.addedBy ?? 'unknown';
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    sections = Array.from(groups.entries())
      .map(([userId, groupItems]) => ({
        key: `person:${userId}`,
        title:
          userId === options.myUserId
            ? 'Added by you'
            : `Added by ${options.nicknameByUserId.get(userId) ?? 'a former member'}`,
        data: groupItems.sort(newestFirst),
      }))
      // You first, current housemates alphabetically, ex-members last.
      .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
  } else {
    const groups = new Map<string, ShoppingItem[]>();
    for (const item of [...pending].sort(newestFirst)) {
      const label = dayLabel(item.createdAt, options.todayStart);
      groups.set(label, [...(groups.get(label) ?? []), item]);
    }
    sections = Array.from(groups.entries()).map(([label, groupItems]) => ({
      key: `day:${label}`,
      title: label,
      data: groupItems,
    }));
  }

  sections = sections.filter((section) => section.data.length > 0);
  if (done.length > 0) sections.push({ key: 'done', title: 'In the basket', data: done });
  return sections;
}
