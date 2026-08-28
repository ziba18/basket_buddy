# Basket Buddy

A shared shopping list app for households — roommates, couples, and family. One shared list that updates in real time for everyone in your "Home," with optional purchase tracking (who bought what, price, and where). Built with [Expo](https://expo.dev) (SDK 54, Expo Router) and [Supabase](https://supabase.com) (Postgres + Auth + Realtime).

Published on the App Store as **Groceries Mate** (the name "Basket Buddy" was already taken).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase project's `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

3. Start the app

   ```bash
   npm start
   ```

   In the output, press `i`/`a`/`w` (or scan the QR code) to open on iOS/Android/web. Sign In with Apple requires a native build (`npm run ios`), not Expo Go.

## Commands

- `npm run lint` — ESLint (`expo lint`)
- `npm run ios` / `npm run android` / `npm run web` — run directly on a platform via a native build
- `eas build --platform ios --profile production --non-interactive --auto-submit` — production iOS build + submit to TestFlight/App Store Connect (see `eas.json`)

There is no test suite configured in this repo.

## Architecture

See [`CLAUDE.md`](./CLAUDE.md) for a detailed architecture overview (routing, auth, realtime sync, data model, theming) and known gotchas.

## Learn more about Expo

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction)
