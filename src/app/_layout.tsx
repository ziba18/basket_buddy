import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { HomeProvider, useHome } from '@/hooks/use-home';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { home, isLoading: isHomeLoading } = useHome();

  const isReady = !isAuthLoading && (!session || !isHomeLoading);
  if (!isReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && !home}>
        <Stack.Screen name="home-setup" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && !!home}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <HomeProvider>
          <AnimatedSplashOverlay />
          <RootNavigator />
        </HomeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
