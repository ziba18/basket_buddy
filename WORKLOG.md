# Basket Buddy — Worklog

Dated log of decisions, what was verified, and why. Newest first.

## 2026-10-16 (afternoon) — "Sign Up Not Completed" fixed: Apple capability reset + build 12

- **Symptom:** Apple's own sheet said "Sign Up Not Completed" (same Apple ID works in Atossa; Groceries Mate never
  appeared under iPhone Settings → Sign in with Apple, so Apple never finished a sign-up for this app). Nothing
  reached Supabase or Render. App ID, profile ("basketbuddy AppStore 2026-08-28 SIWA fix") and Supabase Apple
  provider (client ID `com.zibazamani.basketbuddy`) all looked correct.
- **Fix (user did it in the Apple Developer portal; Claude was blocked from changing capabilities):** on the App ID
  `com.zibazamani.basketbuddy`, untick Sign In with Apple → Save → Confirm, re-tick → Edit → "Enable as a primary
  App ID" → Save → Confirm.
- **Build 12** (1.1.0, EAS `ed7031e3-7dc1-4461-bd2c-fc33246e2cc9`, includes the Render sign-in) was built via `!`,
  which is non-interactive, so EAS skipped profile validation and signed with the old profile; it still uploaded
  to TestFlight fine (`eas submit --id ed7031e3… --non-interactive`, local ASC key `AuthKey_2VSRV4UVQ5.p8`).
  For a real profile regeneration, run `eas build` from the macOS Terminal app (interactive).
- **Verified:** on TestFlight build 12 the Apple sheet completed and Render logged
  `11:41:30 POST /basket-buddy/auth/apple 200 OK`, i.e. Apple token verified + Supabase session minted
  (so `BASKET_SUPABASE_SECRET_KEY` is right). The 1.1.0 build 11 in App Review predates the reset.
  **User confirmed on device: signed in successfully with Apple on build 12.**

## 2026-10-16 (later) — Cloud allowlist, Google OAuth clients, npm 10 lock fix

- **Cloud environment "Default"** (claude.ai/code) network access changed from Trusted to **Custom** with
  `atossa-backend.onrender.com` and `uwqmhhbxthnpgcbgvgqh.supabase.co` allowed, plus the default package-manager
  list. Re-run `cse_018cQR9Ye3mQ6BLsCLWMoaFY`: Supabase REST 200 `[]`, auth health 200, Render `/warmup` 200 (1.5s),
  `/basket-buddy/auth/apple` 401, so keep-alive works now. tsc, eslint and the iOS bundle pass.
- **Google OAuth (project `basket-buddy-505719`):** reused the existing Web client as the audience and created an iOS
  client "Basket Buddy iOS" for `com.zibazamani.basketbuddy`. IDs are in CLAUDE.md. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`,
  `_IOS_CLIENT_ID` and `_IOS_URL_SCHEME` were created in EAS (plaintext, all three environments) and added to `.env`.
- **`npm ci` failed in the cloud only:** npm 10 there vs npm 11 locally. Regenerated `package-lock.json` with
  `npx npm@10 install --package-lock-only`. `npm ci --dry-run` now passes on both npm 10 and 11.
- **Render env vars set by the user** (`atossa-backend` → Environment): `BASKET_GOOGLE_WEB_CLIENT_ID` and
  `BASKET_SUPABASE_SECRET_KEY`. Claude was blocked from editing Render env vars, so it opened the page for them.
  After the redeploy, `/basket-buddy/auth/google` with a junk token went from 500 "not configured" to 401, and
  `/apple` returned 401. Atossa's `/auth/google` still returned 401 and `/warmup` 200. The secret key itself can only be
  proven by a real sign-in (needs the 1.1.1 build): a wrong key would show up as a 502 with "Could not create the user".

## 2026-10-16 — Daily 5am cloud health check

**What:** routine "Basket Buddy daily health check (5am)", `trig_01VoggazE6z4nQLAmKYUc7XB`,
https://claude.ai/code/routines/trig_01VoggazE6z4nQLAmKYUc7XB. It runs in Anthropic's cloud, so it works
with the laptop shut down and Cursor closed. Cron `0 5 * * *` **UTC**, which is 5am London in winter and 6am
during BST. Model claude-sonnet-5-5, no connectors. Needed GitHub connected to Claude (`/web-setup`, done
2026-10-16).

**Why:** the user wants a daily check that the code still builds, and real activity so the free Supabase
project never auto-pauses and Render stays awake.

**What it runs (read-only — never commits, pushes or changes settings):**
1. `git checkout main && git pull --ff-only`
2. `npm ci` → `npx tsc --noEmit` → `npx eslint src` → `npx expo export --platform ios` (with the public
   Supabase URL + publishable key as env) → `npx expo install --check`
3. Supabase activity: `GET /rest/v1/homes?select=id&limit=1` with the publishable key (hits Postgres,
   RLS returns `[]`) and `GET /auth/v1/health`; a paused project is flagged as the top problem.
   (The Supabase MCP connector can't reach this project, it's in another org — hence REST.)
4. Render: `GET https://atossa-backend.onrender.com/warmup` (retries for cold start), then POSTs a junk
   token to `/basket-buddy/auth/{apple,google}` (401 = deployed, 404 = not yet deployed).
5. Report: title `Basket Buddy health YYYY-MM-DD: ALL OK / N problem(s)` + pass/fail table.

Results: the routine's run history at claude.ai/code/routines. Edit or pause it there; routines can
only be deleted there. Atossa has its own routine (`trig_01SdCbNC4eBveA7ZgyXLBPxD`).

**First test run (2026-10-16 09:43 UTC, run `cse_01RN1t3YxNU7rCYnt7goj7fg`):** eslint and the iOS bundle PASS.
Three problems:
- **Supabase and Render were both BLOCKED** by the cloud sandbox's egress proxy (403 on
  `uwqmhhbxthnpgcbgvgqh.supabase.co` and `atossa-backend.onrender.com`). No keep-alive happened. Fix = add
  both hosts to the "Default" cloud environment's network allowlist at claude.ai/code (user action).
- **`npm ci` failed:** the lock file on GitHub `main` is out of sync with `package.json`. The local, uncommitted
  `package-lock.json` is in sync, so this is fixed once it is committed.
- **`tsc` failed** on `@/global.css`: `expo-env.d.ts` is gitignored and therefore missing in a fresh clone.

The routine prompt was updated to create that file, to fall back to `npm install` and report lock drift,
and to run the network steps first.

## 2026-10-16 — Google & Apple sign-in moved to the Render backend (pushed f697707; backend live)

**What:** Google and Apple sign-in now go through Atossa's Render backend
(`https://atossa-backend.onrender.com/basket-buddy/auth/{apple,google}`) instead of Supabase's own
OAuth / `signInWithIdToken`, matching how Atossa does it. The server verifies the Apple/Google
identity token and answers with a normal Supabase session for this project, which the app installs
with `supabase.auth.setSession`. Email/password, data, RLS and realtime are unchanged.

**Changes in this repo**
- `src/lib/social-auth.ts` (new): native Google sign-in (`@react-native-google-signin/google-signin`,
  lazy-required and stubbed in Expo Go/web), Apple/Google token exchange with the server, Google sign-out.
- `src/hooks/use-auth.ts`: `signInWithGoogle`/`signInWithApple` use the server; the Apple nonce is gone
  (the server verifies the token's signature, audience and issuer like Atossa's). Sign-out and
  delete-account also sign out of Google so the account picker shows next time. The return contract
  (error string or `null`) is unchanged, so `welcome.tsx` needed no change.
- `app.config.ts` (new): adds the Google Sign-In config plugin only when
  `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` is set; everything else stays in `app.json`.
- Packages: + `@react-native-google-signin/google-signin` ^16.1.5; − `expo-auth-session`, `expo-crypto`,
  `expo-web-browser` (only used by the old flows).

**Changes in the atossa repo** (backend, uncommitted there too): `backend/app/routers/basket_buddy.py`,
`backend/app/services/basket_buddy_auth.py`, four `basket_*` settings in `config.py`, router registered in
`main.py`. Session minting: admin create user (pre-confirmed, `nickname` metadata, 422 = exists) →
admin `generate_link` magiclink (not emailed) → `/auth/v1/verify` with the `hashed_token` → session.

**Why inside Atossa's service:** user's choice. Render free plan = 750 instance-hours/month per
workspace and Atossa's keep-warm already uses ~744, so a separate service couldn't stay warm (30–60s
cold sign-ins) and could push both over the limit.

**Verified**
- Backend: mock Supabase script (new email → created + session; existing email → 422 then session;
  `sb_secret_` keys sent as `apikey` only, legacy JWT keys also as `Authorization`); routes return 401 for a
  bad token, 500 when the Google client ID isn't configured, 502 when the secret key isn't set.
- App: `tsc --noEmit` clean, eslint clean on changed files, `expo config` resolves with and without the
  URL scheme, `expo export --platform ios` bundles.
- **Not verified live:** needs `BASKET_SUPABASE_SECRET_KEY` + `BASKET_GOOGLE_WEB_CLIENT_ID` on Render,
  Google OAuth clients for `com.zibazamani.basketbuddy`, and a new native build (1.1.1).

**Left to do**
1. Google Cloud: Web + iOS (+ Android with Play signing SHA-1) OAuth clients for Basket Buddy.
2. Render (`atossa-backend` env): `BASKET_SUPABASE_SECRET_KEY`, `BASKET_GOOGLE_WEB_CLIENT_ID`.
3. EAS env (production): `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`,
   `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`.
4. Commit/push both repos (pushing atossa's branch deploys the backend), then build 1.1.1 after
   Groceries Mate 1.1.0's review is done. Keep Supabase's Google/Apple providers on until then.
5. Apple "Sign Up Not Completed" (ticket `20000150113899`) is Apple-side and not fixed by this.
