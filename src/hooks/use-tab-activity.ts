import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useShoppingList } from '@/hooks/use-shopping-list';

// Session-only "have I seen this yet" tracking for the tab badges — reset
// on cold start (not persisted), which is enough to flag activity that
// happened while the app was open but the tab wasn't in front, or while it
// was backgrounded and realtime kept the list in sync underneath you.
export function useTabActivity() {
  const { session } = useAuth();
  const { items } = useShoppingList();
  const myId = session?.user.id ?? null;

  const [listSeenAt, setListSeenAt] = useState(() => Date.now());
  const [purchasedSeenAt, setPurchasedSeenAt] = useState(() => Date.now());

  const hasNewListActivity = useMemo(
    () => items.some((item) => !item.done && item.addedBy !== myId && item.createdAt > listSeenAt),
    [items, myId, listSeenAt]
  );

  const hasNewPurchaseActivity = useMemo(
    () =>
      items.some(
        (item) => item.done && item.purchasedBy !== myId && (item.purchasedAt ?? item.createdAt) > purchasedSeenAt
      ),
    [items, myId, purchasedSeenAt]
  );

  const markListSeen = useCallback(() => setListSeenAt(Date.now()), []);
  const markPurchasedSeen = useCallback(() => setPurchasedSeenAt(Date.now()), []);

  return { hasNewListActivity, hasNewPurchaseActivity, markListSeen, markPurchasedSeen };
}
