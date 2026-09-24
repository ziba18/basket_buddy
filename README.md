# Basket Buddy

A shared shopping list app for households — roommates, couples, and family. One shared list that updates in real time for everyone in your "Home," with optional purchase tracking (who bought what, price, and where). Built with [Expo](https://expo.dev) (SDK 54, Expo Router) and [Supabase](https://supabase.com) (Postgres + Auth + Realtime).

Published on the App Store as **Groceries Mate** (the name "Basket Buddy" was already taken). Also live on [Google Play](https://play.google.com/store/apps/details?id=com.zibazamani.basketbuddy) as **Basket Buddy**, currently in closed testing ahead of full production release.

## Features

- **Shared, real-time list** — everyone in a Home sees additions, edits and check-offs instantly.
- **Sorted by store aisle** — items are grouped Fruit & Veg → Bakery → Meat & Fish → Dairy & Eggs → Pantry → Frozen → Drinks → Snacks → Household → Cleaning, so one pass through the shop covers everything. **Sort by** Aisle, Person (who added it) or Date added.
- **Smart categorization** — typing "chicken thighs" or "oat milk" picks the right aisle automatically; always overridable.
- **Purchase tracking** — log who bought an item, the price (with currency), the date and the shop, all optional.
- **Shared calendar** — plan dates, doctor's appointments and reminders together in a month view with a "Coming up" list.
- **Homes** — create one, rename it, and invite people with a 6-character code, a share link or a QR code.
- **Fast and offline-friendly** — every screen paints from a local cache first, then syncs.
- Sign in with email, Google or Apple.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase project's `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`. For a fresh Supabase project, run `supabase/schema.sql` once in the SQL editor; for an existing one, run any `supabase/migration_*.sql` files it hasn't had yet.

3. Start the app

   ```bash
   npm start
   ```

   In the output, press `i`/`a`/`w` (or scan the QR code) to open on iOS/Android/web. Sign In with Apple requires a native build (`npm run ios`), not Expo Go.

## Commands

- `npm run lint` — ESLint (`expo lint`)
- `npm run ios` / `npm run android` / `npm run web` — run directly on a platform via a native build
- `eas build --platform ios --profile production --non-interactive --auto-submit` — production iOS build + submit to TestFlight/App Store Connect (see `eas.json`)
- `eas build --platform android --profile production --non-interactive --auto-submit` — production Android build + submit to the Play Console track configured in `eas.json` (currently the `alpha` closed-testing track)
- `eas submit --platform android --latest` — re-submit the latest Android build to that track

There is no test suite configured in this repo.

## Architecture

- `src/app/` — Expo Router screens: auth, Home setup, and the `(tabs)` group (List, Purchased, Calendar, Home settings)
- `src/hooks/` — context providers for auth, the active Home, the shopping list and appointments (cache-then-network + Supabase Realtime)
- `src/lib/`, `src/constants/`, `src/components/` — categorization, list grouping, category/catalog data and shared UI
- `supabase/` — `schema.sql` (full schema + row-level security) and incremental `migration_*.sql` files

The app deliberately keeps its native dependency list small to minimise download size. See [`CLAUDE.md`](./CLAUDE.md) for a detailed architecture overview and known gotchas.

## Learn more about Expo

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction)

## License

All rights reserved. This repository is public for viewing purposes only — see [`LICENSE`](./LICENSE).
