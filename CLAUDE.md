# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm install` — install dependencies
- `npm start` (or `npx expo start`) — start the Metro dev server; press `i`/`a`/`w` in the terminal or use the printed QR code to open on iOS/Android/web
- `npm run ios` / `npm run android` / `npm run web` — start directly on a given platform
- `npm run lint` — run ESLint (`expo lint`, flat config in `eslint.config.js` extending `eslint-config-expo/flat`)
- `npm run reset-project` — Expo template helper that moves the starter code aside; not relevant to this app's ongoing development

There is no test suite configured in this repo (no Jest setup, no test script).

## Architecture

This is an Expo Router app (SDK 54, npm package `expo@^54.0.36`) — note this conflicts with the Expo version guidance in AGENTS.md; when in doubt about API availability, check `node_modules/expo/package.json` for the actual installed version. It is a multi-user shopping list app for shared households ("Homes"): auth, home membership, and the shopping list itself are backed by Supabase (Postgres + Auth + Realtime); see `supabase/schema.sql` for the schema/RLS and `.env.example` for the required `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

- **Routing root**: Expo Router auto-detects `src/app` as the routes directory (no `app/` at repo root). `src/app/_layout.tsx` is the root layout and uses `Stack.Protected` guards to route between three states: signed out (`welcome`/`sign-in`/`sign-up`), signed in with no Home yet (`home-setup`), and signed in with a Home (`(tabs)` group: `index` list / `purchased` / `settings`).
- **Path aliases** (`tsconfig.json`): `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- **Auth & Home context**: `src/hooks/use-auth.ts` (`AuthProvider`/`useAuth`) wraps Supabase Auth — email/password (`signUp`/`signIn`) and Google OAuth (`signInWithGoogle`, implicit flow via `expo-auth-session` + `expo-web-browser`'s `openAuthSessionAsync`, redirecting through `app.json`'s `scheme`) — plus the `profiles` row for the nickname. `src/hooks/use-home.ts` (`HomeProvider`/`useHome`) resolves the signed-in user's `homes`/`home_members` row, exposes `createHome`/`joinHome`/`leaveHome`, and subscribes to realtime membership changes. Both providers wrap the app in `src/app/_layout.tsx`.
- **State & persistence**: `src/hooks/use-shopping-list.ts` (`useShoppingList`) is the single source of truth for the active Home's `shopping_items` rows — it loads the list from Supabase and subscribes to realtime `postgres_changes` so every member's list stays intertwined, and exposes `addItem`/`toggleItem`/`deleteItem`/`clearDone`/`logPurchase`. Purchase tracking (who/price/when/where — all optional) lives on the same row and is edited via `src/components/purchase-log-modal.tsx` from the Purchased tab.
- **Local caching**: `src/lib/local-cache.ts` (`readCache`/`writeCache`) is a thin AsyncStorage JSON cache used by `use-auth.ts`/`use-home.ts`/`use-shopping-list.ts` for a cache-then-network pattern — each hook paints cached data immediately on mount, then reconciles with a fresh Supabase fetch, and writes every subsequent state change back to cache (including realtime pushes) so the next load is instant too. Cache keys are scoped by user/home id.
- **Data model**: `src/types/shopping.ts` defines `ShoppingItem` (incl. `unit`/`quantity`/purchase fields), `CategoryId`, `Home`, `HomeMember`, `Profile`. Category metadata (label, color) is a static table in `src/constants/categories.ts` (`CATEGORIES` array, `CATEGORY_BY_ID` lookup). `src/constants/common-items.ts` is the static catalog (`COMMON_ITEMS`, `searchCommonItems`) that powers add-item autocomplete and default unit suggestions — the unit is always user-editable after a suggestion is picked.
- **Theming**: `src/constants/theme.ts` defines the light/dark `Colors` map, the `Spacing` scale, and `Fonts`. `src/hooks/use-theme.ts` (`useTheme`) resolves the active `Colors` entry from `useColorScheme` (`src/hooks/use-color-scheme.ts`, with a hydration-safe `.web.ts` variant for react-native-web). `ThemedText`/`ThemedView` (`src/components/`) are the standard building blocks that read colors from `useTheme` — prefer them over raw `Text`/`View` with hardcoded colors.
- **Splash/launch animation**: `src/app/_layout.tsx` renders `AnimatedSplashOverlay` (`src/components/animated-icon.tsx`), which holds the native splash (`expo-splash-screen`) until layout, then plays a `react-native-reanimated` keyframe transition before unmounting itself.
- **Platform-specific files**: `.web.tsx`/`.web.ts` variants (e.g. `animated-icon.web.tsx`, `use-color-scheme.web.ts`) override the default implementation when bundled for `react-native-web`.
- TypeScript runs in `strict` mode; typed routes (`experiments.typedRoutes`) and the React Compiler (`experiments.reactCompiler`) are enabled in `app.json`. The React Compiler's purity lint (`react-hooks/set-state-in-effect`, `react-hooks/purity`) is strict: effects that load async data must only call `setState` inside a `.then`/subscription callback, never as a direct synchronous statement in the effect body — see the pattern in `use-home.ts`/`use-shopping-list.ts` (plain async fetch functions outside the component, `.then()` inside the effect).
