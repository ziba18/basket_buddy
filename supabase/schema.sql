-- Basket Buddy schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query) for a fresh project.

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: one row per auth user, holds the nickname collected at sign up
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are readable by any authenticated user"
  on profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Auto-create a profile row whenever a user signs up. Email/password sign-up
-- passes an explicit `nickname`; Google sign-in doesn't, so fall back to the
-- name Google shares (`full_name`/`name`) and finally a plain placeholder —
-- either way it's editable later.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'nickname',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      'New user'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- homes + membership
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists homes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists home_members (
  home_id uuid not null references homes (id) on delete cascade,
  -- References `profiles`, not `auth.users` directly, so PostgREST can embed
  -- `profiles ( nickname )` in a `home_members` select (it can only
  -- auto-detect joins between tables in the exposed `public` schema).
  user_id uuid not null references profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (home_id, user_id)
);

alter table homes enable row level security;
alter table home_members enable row level security;

-- Membership check is its own security-definer function so the homes/
-- home_members policies below don't recursively query home_members through RLS.
create or replace function is_home_member(target_home_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from home_members
    where home_id = target_home_id and user_id = auth.uid()
  );
$$;

create policy "any authenticated user can create a home"
  on homes for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "members can read their home's membership list"
  on home_members for select
  to authenticated
  using (is_home_member(home_id));

-- No direct-insert policy: the only ways to become a member are the
-- create_home() and join_home_by_invite_code() functions below, both
-- security definer (they bypass RLS for their own inserts). A client-facing
-- insert policy here — even one scoped to `user_id = auth.uid()` — would let
-- anyone who learns a home_id by any means self-join without ever proving
-- they know the invite code.

create policy "users can remove themselves from a home"
  on home_members for delete
  to authenticated
  using (user_id = auth.uid());

-- Members only — a home's name and invite_code must NOT be readable by
-- non-members, or the invite code stops being a secret. Looking a home up
-- by invite code (to join it) goes through join_home_by_invite_code()
-- below instead of a direct select.
create policy "members can read their home"
  on homes for select
  to authenticated
  using (is_home_member(id));

-- Creates a home and adds the caller as its first member in one atomic,
-- security-definer step. Needed because a plain client-side
-- insert-then-select on `homes` would fail its own RETURNING clause now
-- that `homes` is members-only: the creator isn't a member yet at the
-- moment the home row is inserted.
create or replace function create_home(home_name text, code text)
returns homes
language plpgsql
security definer set search_path = public
as $$
declare
  new_home homes;
begin
  insert into homes (name, invite_code, created_by)
  values (home_name, code, auth.uid())
  returning * into new_home;

  insert into home_members (home_id, user_id)
  values (new_home.id, auth.uid());

  return new_home;
end;
$$;

grant execute on function create_home(text, text) to authenticated;

-- Looks a home up by invite code and joins the caller to it, atomically
-- and server-side. This is the ONLY way to resolve an invite code to a
-- home — there is no client-readable path from code to home_id for
-- someone who isn't already a member, which is the point.
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
    raise exception 'That code doesn''t match any home';
  end if;

  insert into home_members (home_id, user_id)
  values (target_home.id, auth.uid())
  on conflict do nothing;

  return target_home;
end;
$$;

grant execute on function join_home_by_invite_code(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- shopping_items: the shared, intertwined list per home
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references homes (id) on delete cascade,
  name text not null,
  category text not null default 'other',
  unit text,
  quantity text,
  done boolean not null default false,
  added_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  purchased_by uuid references profiles (id),
  purchased_price numeric,
  purchased_at timestamptz,
  purchased_location text
);

alter table shopping_items enable row level security;

create policy "members can read their home's items"
  on shopping_items for select
  to authenticated
  using (is_home_member(home_id));

-- with check pins added_by to the caller — without it, any member could
-- insert an item and attribute it to a different member.
create policy "members can add items to their home"
  on shopping_items for insert
  to authenticated
  with check (
    is_home_member(home_id)
    and (added_by is null or added_by = auth.uid())
  );

-- with check keeps purchased_by (if set) restricted to an actual member of
-- THAT home — still lets you log a purchase on behalf of a housemate who
-- paid, but not attribute it to an arbitrary user in the whole database.
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

create policy "members can delete items in their home"
  on shopping_items for delete
  to authenticated
  using (is_home_member(home_id));

-- Full replica identity so DELETEs carry every column (not just the primary
-- key) in their WAL record — the app's realtime subscription filters on
-- `home_id=eq.<home.id>`, and with the default replica identity a DELETE's
-- old row only includes the primary key (`id`), so that filter can never
-- match and the client never receives the delete event at all.
alter table shopping_items replica identity full;

-- Realtime: broadcast row changes so every member's list stays in sync.
alter publication supabase_realtime add table shopping_items;
alter publication supabase_realtime add table home_members;
