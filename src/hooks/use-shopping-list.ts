import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useHome } from '@/hooks/use-home';
import { readCache, writeCache } from '@/lib/local-cache';
import { supabase } from '@/lib/supabase';
import { CategoryId, PurchaseDetails, ShoppingItem } from '@/types/shopping';

const cacheKey = (homeId: string) => `cache:shopping-items:${homeId}`;

async function fetchItems(homeId: string): Promise<ShoppingItem[]> {
  const { data } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('home_id', homeId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(fromRow);
}

function fromRow(row: any): ShoppingItem {
  return {
    id: row.id,
    homeId: row.home_id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantity: row.quantity,
    done: row.done,
    addedBy: row.added_by,
    createdAt: new Date(row.created_at).getTime(),
    purchasedBy: row.purchased_by,
    purchasedPrice: row.purchased_price,
    purchasedAt: row.purchased_at ? new Date(row.purchased_at).getTime() : null,
    purchasedLocation: row.purchased_location,
  };
}

interface ShoppingListContextValue {
  items: ShoppingItem[];
  isLoaded: boolean;
  addItem: (name: string, category: CategoryId, unit: string | null, quantity: string | null) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearDone: () => Promise<void>;
  logPurchase: (id: string, details: PurchaseDetails) => Promise<void>;
}

const ShoppingListContext = createContext<ShoppingListContextValue | null>(null);

// A provider (not a plain hook) because multiple screens (List, Purchased)
// read the list at once — React Navigation's tab navigator keeps prior tab
// screens mounted, so a plain hook would open one realtime channel per
// mounted screen on the same topic, which Supabase's client rejects with
// "cannot add postgres_changes callbacks ... after subscribe()".
export function ShoppingListProvider({ children }: { children: React.ReactNode }) {
  const { home } = useHome();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!home) return;
    let isCancelled = false;

    // Cache-then-network: paint whatever we last saw for this Home
    // immediately, then reconcile with the server a moment later.
    readCache<ShoppingItem[]>(cacheKey(home.id)).then((cached) => {
      if (isCancelled || !cached) return;
      setItems(cached);
      setIsLoaded(true);
    });

    fetchItems(home.id).then((loaded) => {
      if (isCancelled) return;
      setItems(loaded);
      setIsLoaded(true);
      writeCache(cacheKey(home.id), loaded);
    });

    return () => {
      isCancelled = true;
    };
  }, [home]);

  useEffect(() => {
    if (!home || !isLoaded) return;
    writeCache(cacheKey(home.id), items);
  }, [home, items, isLoaded]);

  useEffect(() => {
    if (!home) return;
    const channel = supabase
      .channel(`shopping-items-${home.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `home_id=eq.${home.id}` },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((item) => item.id !== payload.old.id);
            }
            const next = fromRow(payload.new);
            const exists = prev.some((item) => item.id === next.id);
            return exists
              ? prev.map((item) => (item.id === next.id ? next : item))
              : [next, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [home]);

  const addItem = useCallback(
    async (name: string, category: CategoryId, unit: string | null, quantity: string | null) => {
      const trimmed = name.trim();
      if (!trimmed || !home) return;
      const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
      await supabase.from('shopping_items').insert({
        home_id: home.id,
        name: trimmed,
        category,
        unit: unit?.trim() || null,
        quantity: quantity?.trim() || null,
        added_by: userId,
      });
    },
    [home]
  );

  const toggleItem = useCallback(
    async (id: string) => {
      const item = items.find((entry) => entry.id === id);
      if (!item) return;
      await supabase.from('shopping_items').update({ done: !item.done }).eq('id', id);
    },
    [items]
  );

  const deleteItem = useCallback(async (id: string) => {
    await supabase.from('shopping_items').delete().eq('id', id);
  }, []);

  const clearDone = useCallback(async () => {
    if (!home) return;
    await supabase.from('shopping_items').delete().eq('home_id', home.id).eq('done', true);
  }, [home]);

  const logPurchase = useCallback(async (id: string, details: PurchaseDetails) => {
    await supabase
      .from('shopping_items')
      .update({
        done: true,
        purchased_by: details.purchasedBy,
        purchased_price: details.purchasedPrice,
        purchased_at: details.purchasedAt ? new Date(details.purchasedAt).toISOString() : new Date().toISOString(),
        purchased_location: details.purchasedLocation,
      })
      .eq('id', id);
  }, []);

  const value = useMemo<ShoppingListContextValue>(
    () => ({
      items: home ? items : [],
      isLoaded,
      addItem,
      toggleItem,
      deleteItem,
      clearDone,
      logPurchase,
    }),
    [home, items, isLoaded, addItem, toggleItem, deleteItem, clearDone, logPurchase]
  );

  return createElement(ShoppingListContext.Provider, { value }, children);
}

export function useShoppingList() {
  const context = useContext(ShoppingListContext);
  if (!context) throw new Error('useShoppingList must be used within a ShoppingListProvider');
  return context;
}
