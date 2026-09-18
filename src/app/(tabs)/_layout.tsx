import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTabActivity } from '@/hooks/use-tab-activity';
import { useTheme } from '@/hooks/use-theme';

function TabGlyph({
  glyph,
  color,
  focused,
  activeBackground,
  showBadge,
}: {
  glyph: string;
  color: string;
  focused: boolean;
  activeBackground: string;
  showBadge?: boolean;
}) {
  return (
    <View style={[styles.glyphWrap, focused && { backgroundColor: activeBackground }]}>
      <ThemedText style={{ color, fontSize: 20, lineHeight: 24 }}>{glyph}</ThemedText>
      {showBadge ? <View style={styles.badge} /> : null}
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const { hasNewListActivity, hasNewPurchaseActivity, markListSeen, markPurchasedSeen } = useTabActivity();

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
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph
              glyph="🛒"
              color={color}
              focused={focused}
              activeBackground={theme.backgroundElement}
              showBadge={!focused && hasNewListActivity}
            />
          ),
        }}
        listeners={{ focus: markListSeen }}
      />
      <Tabs.Screen
        name="purchased"
        options={{
          title: 'Purchased',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph
              glyph="🧾"
              color={color}
              focused={focused}
              activeBackground={theme.backgroundElement}
              showBadge={!focused && hasNewPurchaseActivity}
            />
          ),
        }}
        listeners={{ focus: markPurchasedSeen }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph glyph="⌂" color={color} focused={focused} activeBackground={theme.backgroundElement} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  glyphWrap: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: Spacing.two,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
});
