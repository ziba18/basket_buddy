import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const continueWithGoogle = async () => {
    setIsGoogleLoading(true);
    setError(null);
    const message = await signInWithGoogle();
    setIsGoogleLoading(false);
    if (message) setError(message);
  };

  const continueWithApple = async () => {
    setIsAppleLoading(true);
    setError(null);
    const message = await signInWithApple();
    setIsAppleLoading(false);
    if (message) setError(message);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.hero}>
          <ThemedText type="title" style={styles.title}>
            Basket Buddy
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.tagline}>
            One shared shopping list for your home. Add what you need, see what everyone else
            added, and track who bought what.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.actions}>
          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          {Platform.OS === 'ios' ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={
                colorScheme === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={Spacing.three}
              style={styles.appleButton}
              onPress={isAppleLoading ? () => {} : continueWithApple}
            />
          ) : null}

          <Pressable
            onPress={continueWithGoogle}
            disabled={isGoogleLoading}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            {isGoogleLoading ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <ThemedText type="smallBold">Continue with Google</ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.push('/sign-up')}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.text },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" themeColor="background">
              Sign up
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => router.push('/sign-in')}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold">Log in</ThemedText>
          </Pressable>
        </ThemedView>
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
    justifyContent: 'space-between',
    paddingVertical: Spacing.six,
  },
  hero: {
    gap: Spacing.three,
    marginTop: Spacing.six,
  },
  title: {
    fontSize: 40,
    lineHeight: 46,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 24,
  },
  actions: {
    gap: Spacing.two,
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  appleButton: {
    height: 52,
  },
  pressed: {
    opacity: 0.85,
  },
  error: {
    color: '#E53935',
    textAlign: 'center',
  },
});
