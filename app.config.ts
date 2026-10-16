import type { ConfigContext, ExpoConfig } from 'expo/config';

// Everything static lives in app.json; this file only adds the native Google
// Sign-In plugin, which needs EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME (the reversed
// iOS OAuth client ID) at build time. The plugin throws when `iosUrlScheme`
// is empty, which would break `eas credentials`, `expo start` and other
// config-reading commands before the env var exists, so it is only mounted
// once the variable is set.
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  return {
    ...config,
    name: config.name ?? 'Basket Buddy',
    slug: config.slug ?? 'basket_buddy',
    plugins: [
      ...(config.plugins ?? []),
      ...(googleIosUrlScheme
        ? [['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }] as [string, any]]
        : []),
    ],
  };
};
