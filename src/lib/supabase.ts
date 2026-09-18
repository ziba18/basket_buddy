import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project credentials.'
  );
}

// `app.json` builds web with static rendering, which pre-renders routes in
// Node (no `window`/`localStorage`). AsyncStorage's web implementation
// assumes a browser and crashes there, so fall back to a no-op store during
// that pass — native platforms always have AsyncStorage and use it as normal.
const isStaticRenderPass = Platform.OS === 'web' && typeof window === 'undefined';
const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isStaticRenderPass ? noopStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// React Native suspends JS timers while backgrounded, so `autoRefreshToken`
// alone never fires there — the access token can sit expired for however
// long the app was away. Without this, the first request after a long
// absence (e.g. HomeProvider's fetch) races a still-stale token and can
// fail, which used to read as "you have no Home" (see use-home.ts). This is
// Supabase's own documented fix: https://supabase.com/docs/reference/javascript/auth-startautorefresh
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
