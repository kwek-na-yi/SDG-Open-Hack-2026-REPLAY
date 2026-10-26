-- RE:PLAY — Supabase schema.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste this file → Run.
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Profiles: one row per account. Holds the name, body measurements, reminder
-- preference and the account's demo data (wallet, purchases, passports, bag…),
-- so the same account looks identical on every device.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  name             text not null default '',
  handle           text not null default '',
  fit_profile      jsonb,
  fit_reminder_off boolean not null default false,
  state            jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Create the profile row automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'handle', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Listings: second-hand items users sell. Public to read (except removed
-- ones, which only their seller sees); only the seller can create or edit.
-- ---------------------------------------------------------------------------
create table if not exists public.listings (
  id             uuid primary key default gen_random_uuid(),
  seller_id      uuid not null references auth.users (id) on delete cascade,
  seller_handle  text not null,
  img            text not null,
  name           text not null check (char_length(name) between 1 and 80),
  price          numeric(10, 2) not null check (price >= 1 and price <= 5000),
  category       text not null,
  condition      text not null,
  status         text not null default 'active' check (status in ('active', 'sold', 'removed')),
  brand          text,
  size           text,
  material       text,
  original_price numeric(10, 2),
  description    text check (description is null or char_length(description) <= 400),
  buyer_id       uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create index if not exists listings_status_created_idx on public.listings (status, created_at desc);
create index if not exists listings_seller_idx on public.listings (seller_id);

alter table public.listings enable row level security;

drop policy if exists "listings: read" on public.listings;
create policy "listings: read" on public.listings
  for select using (status <> 'removed' or seller_id = auth.uid());

drop policy if exists "listings: insert own" on public.listings;
create policy "listings: insert own" on public.listings
  for insert to authenticated
  with check (seller_id = auth.uid() and status = 'active' and buyer_id is null);

-- Sellers can edit, remove or relist their own unsold items — never mark them sold.
drop policy if exists "listings: update own" on public.listings;
create policy "listings: update own" on public.listings
  for update to authenticated
  using (seller_id = auth.uid() and status <> 'sold')
  with check (seller_id = auth.uid() and status in ('active', 'removed') and buyer_id is null);

-- Buying: atomically claims still-active listings for the signed-in buyer.
-- Returns the ids actually claimed, so an item can never be sold twice
-- (e.g. two devices paying at the same moment).
create or replace function public.buy_listings(listing_ids uuid[])
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  return query
    update public.listings
       set status = 'sold', buyer_id = auth.uid(), updated_at = now()
     where id = any (listing_ids)
       and status = 'active'
       and seller_id <> auth.uid()
    returning id;
end;
$$;

revoke execute on function public.buy_listings(uuid[]) from public, anon;
grant execute on function public.buy_listings(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Listing photos: public bucket; each user may only write inside their own
-- folder (<user id>/…).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "listing images: upload own" on storage.objects;
create policy "listing images: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "listing images: update own" on storage.objects;
create policy "listing images: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "listing images: delete own" on storage.objects;
create policy "listing images: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Realtime: new listings and changes to your own account appear live on
-- every open device.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'listings') then
    alter publication supabase_realtime add table public.listings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;
