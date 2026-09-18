import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useHome } from '@/hooks/use-home';
import { useShoppingList } from '@/hooks/use-shopping-list';
import { useTheme } from '@/hooks/use-theme';
import { ShoppingItem } from '@/types/shopping';

const DISPLAY_MS = 3000;

interface Snapshot {
  done: boolean;
  addedBy: string | null;
  purchasedBy: string | null;
}

// A lightweight in-app "notification": while the app is open, surface a
// toast whenever a housemate (not you) adds or buys something, on top of
// the tab badges from use-tab-activity.ts. No push infra required — it just
// diffs the realtime-synced item list this session already subscribes to.
export function ActivityBanner() {
  const theme = useTheme();
  const { session } = useAuth();
  const { members } = useHome();
  const { items } = useShoppingList();
  const myId = session?.user.id ?? null;

  const [message, setMessage] = useState<string | null>(null);
  const previousRef = useRef<Map<string, Snapshot> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((text: string) => {
    // Deferred a tick so this reaches setState from a callback rather than
    // synchronously in the effect body below (React Compiler's purity lint
    // flags the latter as a cascading-render risk).
    Promise.resolve().then(() => {
      setMessage(text);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setMessage(null), DISPLAY_MS);
    });
  }, []);

  useEffect(() => {
    const previous = previousRef.current;
    const nicknameFor = (userId: string | null) =>
      members.find((member) => member.userId === userId)?.nickname ?? 'Someone';

    if (previous) {
      for (const item of items) {
        const before = previous.get(item.id);
        if (!before) {
          if (item.addedBy && item.addedBy !== myId) {
            announce(`${nicknameFor(item.addedBy)} added ${item.name}`);
          }
        } else if (!before.done && item.done && item.purchasedBy && item.purchasedBy !== myId) {
          announce(`${nicknameFor(item.purchasedBy)} bought ${item.name}`);
        }
      }
    }

    previousRef.current = new Map(
      items.map((item: ShoppingItem) => [item.id, { done: item.done, addedBy: item.addedBy, purchasedBy: item.purchasedBy }])
    );
  }, [items, myId, members, announce]);

  if (!message) return null;

  return (
    <SafeAreaView style={styles.wrapper} pointerEvents="none">
      <ThemedText
        type="smallBold"
        themeColor="background"
        style={[styles.banner, { backgroundColor: theme.text }]}>
        {message}
      </ThemedText>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  banner: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
    overflow: 'hidden',
  },
});
