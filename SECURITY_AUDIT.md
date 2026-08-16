# Basket Buddy — Security Audit

Audited: 2026-08-16. Findings were verified against the live Supabase project (not just the
checked-in `supabase/schema.sql`) by hitting the REST/Auth APIs directly.

**Architecture note:** this app has no custom backend — it's an Expo client talking straight to
Supabase, so Postgres Row Level Security is the *only* authorization boundary. Several sections of
a typical checklist (CORS, webhook signatures, API-route auth, file uploads) are marked N/A below
because the app has no such surface, not because they were skipped.

## Rating: 🔴 Critical *(as found — see remediation status below)*

One live access-control bypass; everything else — secrets handling, SQL-injection surface, XSS
surface, `auth.uid()`-based identity — is unusually clean. The "Home" privacy model has a real
hole: any signed-up user can currently read every household's invite code directly from the
database and join any Home without ever being invited, gaining full read/write access to that
household's shopping list and purchase history. Fixable in about 20 minutes; the only item here
that should block real users from relying on the app for private household data.

## Remediation status: ✅ Applied and verified — 2026-08-16

The Critical, High, and Medium findings below, plus the unused-dependency Low finding, have all
been fixed — both in `supabase/schema.sql` and live on the linked Supabase project — and verified
with real HTTP calls against the live project using disposable test accounts (all cleaned up
afterward). The remaining npm-audit Low finding is intentionally deferred (see that finding).

While verifying the Critical fix, testing surfaced a second gap the original writeup didn't cover:
closing the `homes` read leak alone wasn't sufficient, because the `home_members` INSERT policy
(`with check (user_id = auth.uid())`) never checked invite-code possession either — anyone who
learned a `home_id` through *any* channel could still self-join directly, bypassing
`join_home_by_invite_code()` entirely. Confirmed by testing: a raw insert into `home_members` with
a known `home_id` succeeded (`201`) even after the `homes` table was locked down. Fix: the
direct-insert policy on `home_members` was dropped entirely — `create_home()` and
`join_home_by_invite_code()` are both `security definer` and bypass RLS for their own inserts, so
they remain the only two ways to become a member. Re-tested afterward: the same direct-insert
attempt now correctly fails with a `42501` RLS violation, while joining through the real invite
code still succeeds.

---

## Critical & High findings

### 🔴 Critical — Any signed-up user can read every Home's invite code and join uninvited

**✅ Fixed and verified 2026-08-16** — see [Remediation status](#remediation-status--applied-and-verified---2026-08-16).

**CWE-284 (Improper Access Control) / CWE-639 (IDOR)** · `supabase/schema.sql:107–123`

**What's wrong:** Two policies combine into a full bypass of the "private household" model. The
`homes` SELECT policy is `using (true)` for any authenticated user — it returns every home's `id`,
`name`, and `invite_code` to anyone with an account, not just people who already have a code. The
`home_members` INSERT policy only checks `user_id = auth.uid()` — it never verifies the joiner
actually knew a valid invite code. The invite code isn't a secret gate; it's decorative.

**Why it matters:** A stranger creates a free account, runs one read query against `homes`, and
gets every household's name and invite code in the system. They can insert themselves into
`home_members` for any `home_id` directly — full read/write on that household's shopping list and
purchase log (who bought what, where, for how much).

**Reproduced:**
```
GET /rest/v1/homes?select=id,name,invite_code
Authorization: Bearer <any real user's access token>

→ 200 OK — every Home in the database, invite codes included
```

**The fix:** stop exposing `homes` to non-members entirely, and move "join by code" into a
`security definer` function that checks the code server-side and performs the insert atomically —
the same pattern already used correctly for `is_home_member()` elsewhere in this schema.

```sql
-- 1. Replace the blanket read policy
drop policy "authenticated users can read homes" on homes;

create policy "members can read their home"
  on homes for select
  to authenticated
  using (is_home_member(id));

-- 2. Move "join by invite code" server-side — this is the ONLY
--    way to look up a home you're not already a member of.
create or replace function join_home_by_invite_code(code text)
returns homes
language plpgsql
security definer set search_path = public
as $$
declare
  target_home homes;
begin
  select * into target_home
  from homes
  where invite_code = upper(trim(code));

  if not found then
    raise exception 'Invalid invite code';
  end if;

  insert into home_members (home_id, user_id)
  values (target_home.id, auth.uid())
  on conflict do nothing;

  return target_home;
end;
$$;

grant execute on function join_home_by_invite_code(text) to authenticated;
```

Then swap `joinHome` in `src/hooks/use-home.ts` from a raw `.from('homes').select()` +
`.from('home_members').insert()` pair to a single
`supabase.rpc('join_home_by_invite_code', { code: trimmed })` call.

Effort: ~20 minutes (schema migration + one hook rewrite).

---

### 🟠 High — Home members can forge who added or "bought" any item, to anyone in the database

**✅ Fixed and verified 2026-08-16** — confirmed live: attempting to insert an item with a forged
`added_by` now fails with a `42501` RLS violation.

**CWE-863 (Incorrect Authorization) / trust-the-client identity** · `supabase/schema.sql:151–159`

**What's wrong:** The INSERT policy on `shopping_items` checks membership but never pins
`added_by` to the caller. The UPDATE policy has no `WITH CHECK` at all, so (per Postgres's
documented fallback) it only re-checks `is_home_member(home_id)` — nothing constrains
`purchased_by` to an actual person, let alone a member of that household. The app's own UI always
sends truthful values, but RLS — not the app — is the real boundary; anyone calling the API
directly can send whatever they want.

**Why it matters:** any member of a Home (a legitimate roommate, or the attacker from the finding
above) can insert an item with `added_by` set to a housemate who never added it, or mark any item
"purchased" by an arbitrary `user_id` — not even limited to that home's members — with any price
and location attached.

**The fix:**
```sql
drop policy "members can add items to their home" on shopping_items;
create policy "members can add items to their home"
  on shopping_items for insert
  to authenticated
  with check (
    is_home_member(home_id)
    and (added_by is null or added_by = auth.uid())
  );

drop policy "members can update items in their home" on shopping_items;
create policy "members can update items in their home"
  on shopping_items for update
  to authenticated
  using (is_home_member(home_id))
  with check (
    is_home_member(home_id)
    and (
      purchased_by is null
      or exists (
        select 1 from home_members
        where home_id = shopping_items.home_id
          and user_id = purchased_by
      )
    )
  );
```

This keeps the intended feature — logging a purchase on behalf of whichever housemate actually
paid — while requiring that person to be a real member of *that* home, not anyone at all.

Effort: ~10 minutes.

---

## Medium & low findings

### 🟡 Medium — `profiles` UPDATE policy has no explicit `WITH CHECK`

**✅ Fixed 2026-08-16.**

**CWE-862 (Missing Authorization) — defense in depth** · `supabase/schema.sql:25–28`

Postgres falls back to reusing the `USING` clause as the check when none is given, so this isn't
currently exploitable — `id` is the primary key and a foreign key to `auth.users`, so it can't
practically be hijacked to another identity. Still worth making explicit so a future column
addition doesn't silently become writable by anyone via this same policy.

```sql
drop policy "users can update their own profile" on profiles;
create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
```
Effort: ~2 minutes.

### 🔵 Low — Unused dependency: `@expo/ui`

**✅ Fixed 2026-08-16** (`npm uninstall @expo/ui`).

**CWE-1104 (Unmaintained Third-Party Component)** · `package.json`

Leftover from the original Expo template — not imported anywhere in `src/`. Not a vulnerability by
itself, just unnecessary attack surface and install weight. `npm uninstall @expo/ui`.

Effort: ~1 minute.

### 🔵 Low — 23 npm audit findings, all transitive through Metro's `image-size`

**CWE-1035 (Vulnerable Third-Party Component) — dev tooling only** · `package-lock.json`

11 moderate / 12 high, every one tracing to `image-size` (a denial-of-service via infinite loop
parsing a malicious ICNS/JXL/HEIF image) pulled in by Metro, the dev bundler — not a dependency
the shipped app carries at runtime. `npm audit fix --force` upgrades to `expo@57`, which breaks the
deliberate SDK 54 pin (the Expo Go build in use only supports 54). Real, but low real-world risk —
requires running the dev server against an attacker-supplied image. Revisit when the SDK pin
lifts.

---

## Quick wins (under 10 minutes each)

1. ✅ Add `WITH CHECK` to the `profiles` UPDATE policy — 2 min — done
2. ✅ Pin `added_by`/`purchased_by` in `shopping_items` policies — 10 min — done
3. ✅ Remove unused `@expo/ui` dependency — 1 min — done

## Prioritized remediation plan

| # | Fix | Severity | Effort | Status |
|---|-----|----------|--------|--------|
| 1 | Move Home joining behind `join_home_by_invite_code()`, lock down `homes` SELECT, drop the now-unnecessary `home_members` direct-insert policy | Critical | 20 min | ✅ Done |
| 2 | Add identity-pinning `WITH CHECK` to `shopping_items` insert/update | High | 10 min | ✅ Done |
| 3 | Add explicit `WITH CHECK` to `profiles` update policy | Medium | 2 min | ✅ Done |
| 4 | Remove unused `@expo/ui` | Low | 1 min | ✅ Done |
| 5 | Add basic length/range constraints (item name length, non-negative price) | Low | 10 min | Open |
| 6 | Revisit `npm audit` once the Expo SDK 54 pin lifts | Low | — | Deferred |

---

## What's already done right

- Row Level Security is enabled on all four tables — no unprotected table anywhere in the schema.
- Every policy keys identity off `auth.uid()` — never off client-editable `user_metadata` or a
  request-body field.
- Both `security definer` functions pin `search_path = public`, the standard hardening against
  search-path hijacking.
- No secret ever appears in source — the only `EXPO_PUBLIC_`-prefixed value is the Supabase
  anon/publishable key, which is designed to be public and is meaningless without RLS behind it.
- `.env` is gitignored and was never committed — verified against full git history, not just the
  current tree.
- The app fails fast at startup if Supabase env vars are missing, instead of silently running
  against `undefined`.
- Zero raw SQL from the client — every query goes through the Supabase query builder, closing off
  classic SQL injection.
- No `dangerouslySetInnerHTML` or raw HTML rendering anywhere — user content (item names,
  nicknames, home names) is only ever rendered as React text, which auto-escapes.
- The Google OAuth flow carries a `state` parameter for CSRF protection, managed by Supabase's own
  hosted flow.
- No custom backend exists, so whole classes of server bugs (CORS misconfig, missing method
  enforcement, unauthenticated routes, webhook forgery) are structurally absent rather than merely
  "handled."
- `package-lock.json` is committed, and every dependency traces to a real, well-known package — no
  hallucinated or typosquatted names.
- *(post-remediation)* Home creation and joining now go through `security definer` RPCs
  (`create_home`, `join_home_by_invite_code`) rather than raw client-side inserts — the same
  pattern already used correctly for `is_home_member()`, now applied consistently everywhere it's
  needed.

---

## Checklist summary

Legend: ✅ pass (or fixed) · ❌ fail · ⚠️ partial · — n/a. Verdicts below reflect state
**after** the 2026-08-16 remediation.

**1 · Environment variables & secrets**
1.1 ✅ hardcoded secrets · 1.2 ✅ .gitignore coverage · 1.3 ✅ public-prefix leaks ·
1.4 ✅ console/error leaks · 1.5 ⚠️ source maps (not yet relevant — no production web export deployed) ·
1.6 ✅ startup validation

**2 · Database security**
2.1 ✅ RLS enabled (`homes` SELECT now scoped to members only; `home_members` has no client-facing
insert policy at all) · 2.2 ✅ policies exist · 2.3 ✅ WITH CHECK clauses (fixed on `shopping_items`
insert/update and `profiles` update) · 2.4 ✅ identity = auth.uid() ·
2.5 ✅ service_role isolation · 2.6 — storage buckets (feature not used) · 2.7 ✅ SQL injection ·
2.8 ✅ security definer review (now includes `create_home()`/`join_home_by_invite_code()`, added as
part of the fix — both correctly pin `search_path = public`)

**3 · Authentication & sessions**
3.1 ⚠️ route protection (client-side routing guards only — real boundary is RLS, audited separately) ·
3.2 ✅ default-deny routing · 3.3 ✅ verified server-side (PostgREST validates the JWT on every request) ·
3.4 ✅ auth callback handler · 3.5 ✅ session storage · 3.6 — protected API routes (no custom API) ·
3.7 ✅ OAuth CSRF/state · 3.8 — password reset (not yet built as a feature)

**4 · Server-side validation**
4.1 ⚠️ schema validation (DB constraints exist; no length/range validation yet — see remediation #5) ·
4.2 ✅ identity from session (fixed — see High finding) · 4.3 ✅ XSS / sanitization ·
4.4 — HTTP method enforcement (no custom routes) · 4.5 ⚠️ error info leaks (Postgres constraint
errors surface somewhat technical text to the UI in a few places; not exploitable, just unpolished) ·
4.6 — webhook signatures (app receives no webhooks)

**5 · Dependencies**
5.1 ⚠️ npm audit (23 findings, all dev-tooling only — see Low finding) ·
5.2 ✅ no hallucinated packages · 5.3 ✅ lockfile committed ·
5.4 ⚠️ outdated (a few packages behind, tracked against the deliberate SDK 54 pin) ·
5.5 ✅ unused dependency (`@expo/ui` removed)

**6 · Rate limiting** — 6.1/6.2/6.3 — no custom expensive endpoints; auth rate limiting is handled
at the Supabase platform level, not app code.

**7 · CORS** — 7.1/7.2 — no custom API routes to configure CORS on.

**8 · File uploads** — 8.1/8.2/8.3 — not a feature in this app.
