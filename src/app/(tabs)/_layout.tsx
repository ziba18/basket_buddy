import { Tabs } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

function TabGlyph({ glyph, color }: { glyph: string; color: string }) {
  return <ThemedText style={{ color, fontSize: 20, lineHeight: 24 }}>{glyph}</ThemedText>;
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.backgroundElement },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'List',
          tabBarIcon: ({ color }) => <TabGlyph glyph="🛒" color={color} />,
        }}
      />
      <Tabs.Screen
        name="purchased"
        options={{
          title: 'Purchased',
          tabBarIcon: ({ color }) => <TabGlyph glyph="🧾" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabGlyph glyph="⌂" color={color} />,
        }}
      />
    </Tabs>
  );
}
