# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm install` — install dependencies
- `npm start` (or `npx expo start`) — start the Metro dev server; press `i`/`a`/`w` in the terminal or use the printed QR code to open on iOS/Android/web
- `npm run ios` / `npm run android` / `npm run web` — start directly on a given platform
- `npm run lint` — run ESLint (`expo lint`, flat config in `eslint.config.js` extending `eslint-config-expo/flat`)
- `npm run reset-project` — Expo template helper that moves the starter code aside; not relevant to this app's ongoing development

There is no test suite configured in this repo (no Jest setup, no test script). For verification, ad-hoc scripts run with `npx tsx --tsconfig tsconfig.json <file>` (must live inside the repo to resolve `node_modules`/`@/` aliases), and live end-to-end checks can sign in as the reviewer account from `.reviewer-credentials.txt` via `@supabase/supabase-js` — clean up any test rows afterwards.
- **DB migrations**: new schema changes ship as a standalone `supabase/migration_*.sql` (and are folded into `schema.sql`). The Supabase CLI here isn't authenticated and `supabase login` can't run from Claude Code's non-TTY shell, so migrations are applied by pasting into the dashboard SQL editor. Verify afterwards with a REST call (`PGRST205` = table missing, `42703` = column missing).

## Architecture

This is an Expo Router app (SDK 54, npm package `expo@^54.0.36`) — note this conflicts with the Expo version guidance in AGENTS.md; when in doubt about API availability, check `node_modules/expo/package.json` for the actual installed version. It is a multi-user shopping list app for shared households ("Homes"): auth, home membership, and the shopping list itself are backed by Supabase (Postgres + Auth + Realtime); see `supabase/schema.sql` for the schema/RLS and `.env.example` for the required `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

- **Routing root**: Expo Router auto-detects `src/app` as the routes directory (no `app/` at repo root). `src/app/_layout.tsx` is the root layout and uses `Stack.Protected` guards to route between three states: signed out (`welcome`/`sign-in`/`sign-up`), signed in with no Home yet (`home-setup`), and signed in with a Home (`(tabs)` group: `index` list / `purchased` / `calendar` / `settings`).
- **Path aliases** (`tsconfig.json`): `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- **Auth & Home context**: `src/hooks/use-auth.ts` (`AuthProvider`/`useAuth`) wraps Supabase Auth — email/password (`signUp`/`signIn`) directly against Supabase, plus Google (`signInWithGoogle`) and Sign In with Apple (`signInWithApple`), which since 2026-10-16 go **through the Render backend shared with Atossa** (see "Social sign-in via Render" below) — plus the `profiles` row for the nickname. All three sign-in methods wrap their entire body in try/catch and return an error string (or `null`) rather than throwing — `welcome.tsx`'s callers also wrap in try/catch/finally as defense-in-depth so a loading spinner can never get stuck and a failure is always surfaced as visible text, never silent. `src/hooks/use-home.ts` (`HomeProvider`/`useHome`) resolves the signed-in user's `homes`/`home_members` row, exposes `createHome`/`joinHome`/`leaveHome`, and subscribes to realtime membership changes. Both providers wrap the app in `src/app/_layout.tsx`. `createHome`/`joinHome` call the `create_home`/`join_home_by_invite_code` Postgres RPCs (`supabase/schema.sql`) rather than inserting into `homes`/`home_members` directly — `homes` SELECT is members-only and `home_members` has no client-facing insert policy at all, so those two `security definer` functions are the only way to create or join a Home (see `SECURITY_AUDIT.md` for why: the invite code has to actually gate joining, not just be checked client-side).
- **State & persistence**: `src/hooks/use-shopping-list.ts` (`ShoppingListProvider`/`useShoppingList`) is the single source of truth for the active Home's `shopping_items` rows — it loads the list from Supabase and subscribes to realtime `postgres_changes` so every member's list stays intertwined, and exposes `addItem`/`toggleItem`/`deleteItem`/`clearDone`/`logPurchase`. Purchase tracking (who/price/when/where — all optional) lives on the same row and is edited via `src/components/purchase-log-modal.tsx` from the Purchased tab. It's a Context provider (mounted once in `_layout.tsx`, alongside `AuthProvider`/`HomeProvider`), not a plain hook each screen calls independently — React Navigation's tab navigator keeps prior tab screens mounted, so a plain hook opened one realtime channel per mounted screen on the same topic and Supabase's client threw `cannot add postgres_changes callbacks ... after subscribe()` when switching tabs. Any new screen that needs the list must consume the existing context, not re-implement its own fetch/subscribe.
- **Categories are store aisles, in walk order**: `CATEGORIES` (`src/constants/categories.ts`) is ordered like a supermarket walk (Fruit & Veg → Bakery → … → Cleaning → Other) and the List tab's default "Aisle" sort groups sections in that order. The old catch-all `groceries` id was retired — `resolveCategory` (`src/lib/smart-categorize.ts`) re-guesses any unknown/legacy category from the item name on fetch and on cache read, so never index `CATEGORY_BY_ID` with a raw DB value. Older app builds crash on category ids they don't know, so every household member needs the same app version after a category change. The List tab's Sort-by (Aisle/Person/Date added, `src/lib/list-sections.ts`) is a per-device AsyncStorage preference (`pref:list-sort`).
- **Appointments (Calendar tab)**: `src/hooks/use-appointments.ts` (`AppointmentsProvider`, mounted in `_layout.tsx` inside `ShoppingListProvider`) follows the same provider + cache-then-network + realtime pattern as the shopping list, against the `appointments` table (`supabase/migration_appointments.sql`, also folded into `schema.sql`; `replica identity full` for the same DELETE reason below). `src/components/month-calendar.tsx` is the shared month grid used by both the Calendar tab and the purchase `DatePicker`.
- **Realtime DELETE gotcha**: `shopping_items` has `replica identity full` (see `supabase/schema.sql`) because the app's realtime subscription filters on `home_id=eq.<id>`, and with Postgres's default replica identity a `DELETE`'s WAL record only carries the primary key (`id`) — Realtime can't evaluate a filter on a column it doesn't have, so it silently drops the event and connected clients never learn a row was deleted (the delete still succeeds in the DB; only the live UI update is missing). If a new realtime-filtered table is added, it needs the same treatment unless its primary key already includes the filtered column (e.g. `home_members`'s composite `(home_id, user_id)` PK doesn't need it).
- **Local caching**: `src/lib/local-cache.ts` (`readCache`/`writeCache`) is a thin AsyncStorage JSON cache used by `use-auth.ts`/`use-home.ts`/`use-shopping-list.ts`/`use-appointments.ts` for a cache-then-network pattern — each hook paints cached data immediately on mount, then reconciles with a fresh Supabase fetch, and writes every subsequent state change back to cache (including realtime pushes) so the next load is instant too. Cache keys are scoped by user/home id.
- **Data model**: `src/types/shopping.ts` defines `ShoppingItem` (incl. `unit`/`quantity`/purchase fields), `CategoryId`, `ListSortMode`, `Appointment`/`AppointmentDraft`/`AppointmentKind`, `Home`, `HomeMember`, `Profile`. Appointment kinds (Date/Doctor/Reminder/Other — label, emoji, color) live in `src/constants/appointment-kinds.ts`. Category metadata (label, color) is a static table in `src/constants/categories.ts` (`CATEGORIES` array, `CATEGORY_BY_ID` lookup). `src/constants/common-items.ts` is the static catalog (`COMMON_ITEMS`, `searchCommonItems`) that powers add-item autocomplete and default unit suggestions — the unit is always user-editable after a suggestion is picked. Every user-reference column (`home_members.user_id`, `homes.created_by`, `shopping_items.added_by`/`purchased_by`) is a FK to `profiles(id)`, not `auth.users(id)` — PostgREST can only auto-embed a join (e.g. `home_members` → `profiles(nickname)`, used to resolve nicknames) between tables that have a direct FK and are both in the exposed `public` schema; `auth.users` isn't exposed, so pointing at it silently breaks embedding (the query errors, `.then(({data}) => ...)` ignores the error, and the affected list/map just renders empty).
- **Theming**: `src/constants/theme.ts` defines the light/dark `Colors` map, the `Spacing` scale, and `Fonts`. `src/hooks/use-theme.ts` (`useTheme`) resolves the active `Colors` entry from `useColorScheme` (`src/hooks/use-color-scheme.ts`, with a hydration-safe `.web.ts` variant for react-native-web). `ThemedText`/`ThemedView` (`src/components/`) are the standard building blocks that read colors from `useTheme` — prefer them over raw `Text`/`View` with hardcoded colors.
- **Splash/launch animation**: `src/app/_layout.tsx` renders `AnimatedSplashOverlay` (`src/components/animated-icon.tsx`), which holds the native splash (`expo-splash-screen`) until layout, then fades itself out with React Native's built-in `Animated` (native driver) before unmounting.
- **Keep the native dependency list lean**: Reanimated/Worklets, react-native-svg (+ react-native-qrcode-svg, which also dragged in a CSS parser), gesture-handler, expo-image, expo-glass-effect, expo-symbols, expo-device and expo-status-bar were removed to cut app size — the Home-invite QR code is drawn with plain Views (`src/components/qr-code.tsx`, using only `qrcode`'s core encoder). Check whether a feature can be done with core React Native before adding a native module; every one ships in the binary for every user.
- **Platform-specific files**: `.web.tsx`/`.web.ts` variants (e.g. `animated-icon.web.tsx`, `use-color-scheme.web.ts`) override the default implementation when bundled for `react-native-web`.
- TypeScript runs in `strict` mode; typed routes (`experiments.typedRoutes`) and the React Compiler (`experiments.reactCompiler`) are enabled in `app.json`. The React Compiler's purity lint (`react-hooks/set-state-in-effect`, `react-hooks/purity`) is strict: effects that load async data must only call `setState` inside a `.then`/subscription callback, never as a direct synchronous statement in the effect body — see the pattern in `use-home.ts`/`use-shopping-list.ts` (plain async fetch functions outside the component, `.then()` inside the effect).
- **EAS cloud builds need their own env vars**: `src/lib/supabase.ts` throws synchronously at import time if `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing, which crashes the app instantly on launch. `.env` is gitignored and never reaches EAS's cloud build environment on its own — these two vars must also be set via `eas env:create --scope project --environment production --environment preview --environment development` (or the Expo dashboard) before a `production`/`preview` build will actually run once installed. `eas env:list --environment production` confirms what's currently set. This bit a real TestFlight submission (build launched fine locally/in Expo Go, crashed instantly from TestFlight) — check this first on any "works locally, crashes in TestFlight" report.

## Android / Play Store status (2026-08-29)

Package `com.zibazamani.basketbuddy` is live on Google Play: `https://play.google.com/store/apps/details?id=com.zibazamani.basketbuddy`. The Play Console developer account ("Atossa") is owned by a co-founder (`rudenko.paul@gmail.com`), not the primary maintainer's personal Google account — sign in as the account owner to manage listing/release settings.

**TestFlight build 12 (2026-10-16, v1.1.0, EAS `ed7031e3`)** is the first build with Google/Apple sign-in via Render; Apple **and Google** sign-in confirmed working on device. Build 11 (below) is the one in App Review.

**Latest release (2026-09-24): v1.1.0** — Android versionCode 6 auto-submitted to the Closed Test `alpha` track (`eas.json` submit track is `alpha`, not `internal`); iOS build 11 uploaded to App Store Connect/TestFlight. Build numbers are remote/auto-incremented (`appVersionSource: remote`); only `expo.version` in `app.json` is bumped by hand. Production `eas build` commands are blocked by Claude Code's auto-mode classifier — hand the user the exact `! npx eas-cli build ...` command to run instead. The size cuts (removed native modules) landed after 1.1.0 and need a new build (1.1.1).

- **An Internal-Testing-only app has no real store item page.** Testers hit "item not found" until the app also has a release on Closed Test, Open Test, or Production — check Advanced Settings → App availability first if this happens; it says so explicitly. Fix here: pushed the build to a `Closed Test - Alpha` track (all countries, testers added) and submitted for review.
- **The internal-test opt-in link is one shared link per track, not per-tester** — there's no way to generate a distinct link per person. It also failed specifically for the Play Console account owner while working for another tester on the same list (no root cause found); the working fix was to have the owner use the Closed Test link instead.
- **Internal App Sharing needs up to 48 hours** of one-time key-generation/identity-verification before it's usable — not a same-day fallback. A direct APK sideload from the EAS build artifacts URL is the reliable same-day option when Play-side tester flows are stuck.
- **Production access requires a closed test with ≥12 testers opted in continuously for the 14 days immediately before requesting access** (Google policy for accounts created after 2023-11-13) — opting out and back in resets that tester's clock. Since ~April 2026 Google also checks for genuine engagement (testers must actually open/use the app repeatedly), not just opt in. Internal Testing participation never counts toward this gate — only Closed/Open Test does.
- The reviewer test account (`.reviewer-credentials.txt`, gitignored — invite code lives there, not here) has a pre-populated "Review Household" — its Home membership has been found missing twice (again 2026-09-24, alongside the sample items being replaced by a gibberish item), almost certainly Google Play's pre-launch-report robots signing in with these credentials and tapping around ("Leave this Home" had no confirmation until then). Rejoining via the invite code and re-seeding Milk/Bananas/Eggs(purchased) fixes it. Re-verify this account has active Home membership before each submission.
- Play Store screenshots (`assets/images/play-store-screenshots/`) were captured via `npx expo start --web`, not a native emulator/simulator. `MaxContentWidth = 800` in `src/constants/theme.ts` centers content on wide viewports — the browser window needs to be narrowed below 800px for screenshots to render edge-to-edge like a real phone.

## Social sign-in via Render (2026-10-16)

Google and Apple sign-in no longer use Supabase's own OAuth/`signInWithIdToken`. They work like Atossa's:
the app gets an identity token natively (`expo-apple-authentication`; `@react-native-google-signin/google-signin`
for Google), POSTs it to `https://atossa-backend.onrender.com/basket-buddy/auth/{apple,google}`, and installs the
returned **Supabase** session with `supabase.auth.setSession`. Code: `src/lib/social-auth.ts` + `src/hooks/use-auth.ts`.
All data, RLS and realtime stay on Supabase unchanged; email/password still talks to Supabase directly.

- **Server side lives in the atossa repo**, not here: `backend/app/routers/basket_buddy.py` +
  `backend/app/services/basket_buddy_auth.py` (deployed from atossa's `mvp-symptom-capture` branch). It reuses
  Atossa's token verification (`social_auth.py`, verified email required), then uses this Supabase project's admin
  API: create the user pre-confirmed if new (`nickname` metadata → `handle_new_user` trigger), generate a magic link
  (not emailed), verify its `hashed_token` → session. Users are matched **by email**, so existing accounts keep
  their data. Nothing is stored in Atossa's database. Hosted inside Atossa's service on purpose: Render's free plan
  is 750 instance-hours/month per workspace and Atossa's keep-warm ping already uses ~744, so a second service
  could not stay awake.
- **Google token audience:** the server accepts Basket Buddy's Web *and* iOS client IDs (hardcoded in atossa
  `config.py` `basket_google_known_client_ids`) plus `BASKET_GOOGLE_WEB_CLIENT_ID`. An "Invalid audience" error on
  Google sign-in means a new client ID that is in neither list. That's how build 12 first failed (fixed 2026-10-16).
- **Render env vars (on `atossa-backend`)**: `BASKET_SUPABASE_SECRET_KEY` (this project's service_role / `sb_secret_`
  key — the user sets it in the Render dashboard; never commit or print it), `BASKET_GOOGLE_WEB_CLIENT_ID`.
  Defaults in atossa's `config.py`: `BASKET_SUPABASE_URL` = this project, `BASKET_APPLE_BUNDLE_ID` =
  `com.zibazamani.basketbuddy`.
- **App env vars (EAS `production` + `.env`)**: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (must equal the server's),
  `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` (reversed iOS client ID). Optional
  `EXPO_PUBLIC_AUTH_API_URL` (defaults to the Render URL). `app.config.ts` only mounts the Google plugin once
  the URL scheme is set (the plugin throws without it). Android also needs an Android OAuth client in Google
  Cloud with the Play signing key's SHA-1.
- **Google OAuth clients (Google Cloud project `basket-buddy-505719`, set up 2026-10-16):** Web = existing
  "Basket Buddy Web" `26319592248-opmaj600n8u25t50n1uggm95d2c2agup.apps.googleusercontent.com` (also what Supabase's
  Google provider uses; it's the token audience). iOS = "Basket Buddy iOS"
  `26319592248-u75rpg95amvomqf00e8g2dot96al2q9t.apps.googleusercontent.com`, URL scheme
  `com.googleusercontent.apps.26319592248-u75rpg95amvomqf00e8g2dot96al2q9t`. All three `EXPO_PUBLIC_GOOGLE_*` are set in
  EAS (production/preview/development) and `.env`. No Android client yet (needs the Play signing SHA-1).
- **Lock file must satisfy npm 10:** the cloud health check (and possibly EAS) runs npm 10, which rejected a lock
  written by npm 11 on the Mac (missing `@emnapi/*`, `typescript@5.9.3`). After dependency changes, regenerate with
  `npx npm@10 install --package-lock-only --ignore-scripts` and check `npx npm@10 ci --dry-run` passes.
- **Needs a new native build** (1.1.1+): it adds `@react-native-google-signin/google-signin` and removes
  `expo-auth-session`, `expo-crypto`, `expo-web-browser`. Google sign-in does not work in Expo Go (the module is
  stubbed there with a readable error); Apple sign-in does not work in Expo Go either (token audience is Expo Go's
  bundle ID, not ours).
- The Apple "Sign Up Not Completed" error (ticket `20000150113899`) was fixed 2026-10-16 by resetting the App ID's
  Sign In with Apple capability (untick/save, re-tick as primary/save); verified on TestFlight build 12 (user signed in successfully on device). If it ever
  returns, do that reset first (see WORKLOG 2026-10-16 afternoon).
- Supabase's Google/Apple providers in the dashboard are no longer used by the app; leave them until 1.1.0
  (the build in review) is replaced, since that build still signs in through them.

## Daily cloud health check (2026-10-16)

Routine "Basket Buddy daily health check (5am)" (`trig_01VoggazE6z4nQLAmKYUc7XB`,
https://claude.ai/code/routines/trig_01VoggazE6z4nQLAmKYUc7XB) runs every day at 05:00 **UTC** in Anthropic's
cloud (independent of the laptop). It is read-only: `npm ci`, `tsc`, `eslint src`, `expo export --platform ios`
and `expo install --check` on `main`. It keeps Supabase active with a REST query (publishable key) plus
`/auth/v1/health`, and wakes Render (`/warmup`, `/basket-buddy/auth/*`). Read reports in the routine's
run history at claude.ai/code/routines; full command list in WORKLOG.md 2026-10-16. If the routine's
report says the Supabase project is paused, restore it from the Supabase dashboard.

