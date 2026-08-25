-- Account deletion migration — run once in the Supabase SQL editor
-- (Project > SQL Editor > New query) against the existing live project.
--
-- schema.sql already reflects this end state for fresh projects; this file
-- brings an already-provisioned database up to date via ALTERs instead of
-- CREATE TABLE, since `create table if not exists` is a no-op here.

alter table homes
  alter column created_by drop not null;

alter table homes
  drop constraint if exists homes_created_by_fkey,
  add constraint homes_created_by_fkey
    foreign key (created_by) references profiles (id) on delete set null;

alter table shopping_items
  drop constraint if exists shopping_items_added_by_fkey,
  add constraint shopping_items_added_by_fkey
    foreign key (added_by) references profiles (id) on delete set null;

alter table shopping_items
  drop constraint if exists shopping_items_purchased_by_fkey,
  add constraint shopping_items_purchased_by_fkey
    foreign key (purchased_by) references profiles (id) on delete set null;

create or replace function delete_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function delete_account() to authenticated;
