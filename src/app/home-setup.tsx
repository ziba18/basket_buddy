import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useHome } from '@/hooks/use-home';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'create' | 'join';

// Pulls an invite code out of a `basketbuddy://join?code=XXXX` deep link —
// the same shape the Settings QR code encodes — so scanning it lands
// straight on the join tab with the code filled in.
function extractInviteCode(url: string | null): string | null {
  if (!url) return null;
  try {
    const { hostname, path, queryParams } = Linking.parse(url);
    if (hostname !== 'join' && path !== 'join') return null;
    const code = queryParams?.code;
    return typeof code === 'string' ? code : null;
  } catch {
    return null;
  }
}

export default function HomeSetupScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const { createHome, joinHome } = useHome();
  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const incomingUrl = Linking.useURL();
  useEffect(() => {
    const code = extractInviteCode(incomingUrl);
    if (!code) return;
    // Deferred a tick so the state update happens from a callback rather
    // than synchronously in the effect body (React Compiler's purity lint
    // flags the latter as a cascading-render risk).
    Promise.resolve().then(() => {
      setMode('join');
      setInviteCode(code);
    });
  }, [incomingUrl]);

  const value = mode === 'create' ? name : inviteCode;
  const canSubmit = value.trim().length > 0 && !isSubmitting;

  const submit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    const message = mode === 'create' ? await createHome(name) : await joinHome(inviteCode);
    setIsSubmitting(false);
    if (message) setError(message);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.hero}>
          <ThemedText type="title" style={styles.title}>
            Set up your Home
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            A Home is the shared space your shopping list lives in. Create one for your place, or
            join one with an invite code from a roommate.
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.tabs, { backgroundColor: theme.backgroundElement }]}>
          <Pressable
            onPress={() => {
              setMode('create');
              setError(null);
            }}
            style={[styles.tab, mode === 'create' && { backgroundColor: theme.background }]}>
            <ThemedText type="smallBold" themeColor={mode === 'create' ? 'text' : 'textSecondary'}>
              Create a Home
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              setMode('join');
              setError(null);
            }}
            style={[styles.tab, mode === 'join' && { backgroundColor: theme.background }]}>
            <ThemedText type="smallBold" themeColor={mode === 'join' ? 'text' : 'textSecondary'}>
              Join a Home
            </ThemedText>
          </Pressable>
        </ThemedView>

        {mode === 'create' ? (
          <FormField
            label="Home name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. The Loft"
            autoCapitalize="words"
          />
        ) : (
          <FormField
            label="Invite code"
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="e.g. 4XQ9KP"
            autoCapitalize="characters"
          />
        )}

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: canSubmit ? theme.text : theme.backgroundSelected },
            pressed && canSubmit && styles.pressed,
          ]}>
          {isSubmitting ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <ThemedText type="smallBold" themeColor={canSubmit ? 'background' : 'textSecondary'}>
              {mode === 'create' ? 'Create Home' : 'Join Home'}
            </ThemedText>
          )}
        </Pressable>

        <Pressable onPress={signOut} style={styles.signOut}>
          <ThemedText type="small" themeColor="textSecondary">
            Sign out
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    gap: Spacing.four,
  },
  hero: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: Spacing.half,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  pressed: {
    opacity: 0.85,
  },
  error: {
    color: '#E53935',
  },
  signOut: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
