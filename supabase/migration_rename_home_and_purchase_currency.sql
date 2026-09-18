-- Rename-home + purchase-currency migration — run once in the Supabase SQL
-- editor (Project > SQL Editor > New query) against the existing live
-- project. schema.sql already reflects this end state for fresh projects.

alter table shopping_items
  add column if not exists purchased_currency text;

create or replace function rename_home(target_home_id uuid, new_name text)
returns homes
language plpgsql
security definer set search_path = public
as $$
declare
  updated_home homes;
begin
  if not is_home_member(target_home_id) then
    raise exception 'Not a member of this home';
  end if;

  if trim(new_name) = '' then
    raise exception 'Give your home a name';
  end if;

  update homes set name = trim(new_name)
  where id = target_home_id
  returning * into updated_home;

  return updated_home;
end;
$$;

grant execute on function rename_home(uuid, text) to authenticated;
