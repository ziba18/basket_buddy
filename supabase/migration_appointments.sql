-- Appointments migration — run once in the Supabase SQL editor
-- (Project > SQL Editor > New query) against the existing live project.
-- schema.sql already reflects this end state for fresh projects.

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references homes (id) on delete cascade,
  title text not null check (trim(title) <> ''),
  kind text not null default 'other',
  starts_at timestamptz not null,
  all_day boolean not null default false,
  location text,
  notes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists appointments_home_starts_at_idx on appointments (home_id, starts_at);

alter table appointments enable row level security;

create policy "members can read their home's appointments"
  on appointments for select
  to authenticated
  using (is_home_member(home_id));

create policy "members can add appointments to their home"
  on appointments for insert
  to authenticated
  with check (
    is_home_member(home_id)
    and (created_by is null or created_by = auth.uid())
  );

create policy "members can update appointments in their home"
  on appointments for update
  to authenticated
  using (is_home_member(home_id))
  with check (is_home_member(home_id));

create policy "members can delete appointments in their home"
  on appointments for delete
  to authenticated
  using (is_home_member(home_id));

-- Same reason as shopping_items: the realtime subscription filters on
-- home_id, which a DELETE's WAL record only carries with full replica identity.
alter table appointments replica identity full;

alter publication supabase_realtime add table appointments;
