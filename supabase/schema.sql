-- Be Celeb Supabase schema
-- Final feedback fixed version: non-destructive, idempotent MVP tables

create extension if not exists "pgcrypto";

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. User profile
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nickname text,
  instagram_username text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists is_deleted boolean not null default false;
alter table public.profiles add column if not exists deleted_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
update public.profiles
set nickname = 'user_' || substring(user_id::text, 1, 8)
where nickname is null;
alter table public.profiles alter column nickname set not null;

create unique index if not exists profiles_nickname_unique_idx on public.profiles(nickname);
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_nickname on public.profiles(nickname);
create index if not exists idx_profiles_instagram_username on public.profiles(instagram_username);

-- 2. Creator profile / onboarding detail
create table if not exists public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  instagram_experience text,
  categories text[] not null default '{}',
  follower_range text,
  upload_frequency text,
  content_goal text,
  preferred_style text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creator_profiles_user_id on public.creator_profiles(user_id);
create index if not exists idx_creator_profiles_onboarding_completed on public.creator_profiles(onboarding_completed);

-- 3. User plan / recommendation usage
create table if not exists public.user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_name text not null default 'free',
  monthly_recommendation_limit integer not null default 5,
  monthly_recommendation_used integer not null default 0,
  renews_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_plans_user_id on public.user_plans(user_id);
create index if not exists idx_user_plans_plan_name on public.user_plans(plan_name);

-- 4. Trends
create table if not exists public.trends (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null,
  category text,
  summary text,
  score integer not null default 0,
  keywords text[] not null default '{}',
  hashtags text[] not null default '{}',
  thumbnail_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trends add column if not exists score integer not null default 0;
update public.trends set category = 'general' where category is null;
update public.trends set summary = '' where summary is null;
alter table public.trends alter column category set not null;
alter table public.trends alter column summary set not null;

create unique index if not exists trends_title_unique_idx on public.trends(title);
create index if not exists idx_trends_type on public.trends(type);
create index if not exists idx_trends_category on public.trends(category);
create index if not exists idx_trends_is_active on public.trends(is_active);
create index if not exists idx_trends_score on public.trends(score desc);

-- 5. Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  price integer,
  image_url text,
  purchase_url text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists products_name_unique_idx on public.products(name);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_is_active on public.products(is_active);

-- 6. Favorites
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  target_id uuid not null,
  title text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, type, target_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'favorites_type_check'
  ) then
    alter table public.favorites
      add constraint favorites_type_check
      check (type in ('trend', 'product', 'recommendation')) not valid;
  end if;
end $$;

-- Validate the favorite target type constraint after adding it.
alter table public.favorites validate constraint favorites_type_check;

create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_favorites_type on public.favorites(type);

-- 7. Addresses
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null,
  phone text not null,
  zipcode text not null,
  address1 text not null,
  address2 text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_addresses_user_id on public.addresses(user_id);
create index if not exists idx_addresses_user_default on public.addresses(user_id, is_default);

-- Guarantees only one default shipping address per user.
create unique index if not exists addresses_one_default_per_user_idx
on public.addresses(user_id)
where is_default = true;

-- 8. Public service contents
create table if not exists public.service_contents (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  title text not null,
  description text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists service_contents_section_unique_idx on public.service_contents(section);
create index if not exists idx_service_contents_section on public.service_contents(section);
alter table public.service_contents add column if not exists sort_order integer not null default 0;

-- Backfill sort_order from legacy display_order if the older column exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_contents'
      and column_name = 'display_order'
  ) then
    execute 'update public.service_contents set sort_order = display_order where sort_order = 0 and display_order is not null';
  end if;
end $$;

create index if not exists idx_service_contents_active on public.service_contents(is_active);
create index if not exists idx_service_contents_sort_order on public.service_contents(sort_order);

-- 9. Sample recommendations
create table if not exists public.sample_recommendations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  hook text not null,
  hashtags text[] not null default '{}',
  summary text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sample_recommendations_title_unique_idx on public.sample_recommendations(title);
create index if not exists idx_sample_recommendations_category on public.sample_recommendations(category);
alter table public.sample_recommendations add column if not exists sort_order integer not null default 0;

create index if not exists idx_sample_recommendations_active on public.sample_recommendations(is_active);
create index if not exists idx_sample_recommendations_sort_order on public.sample_recommendations(sort_order);

-- 10. Strategy articles
create table if not exists public.strategy_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  category text not null,
  summary text not null,
  thumbnail_url text,
  content text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.strategy_articles add column if not exists thumbnail_url text;
update public.strategy_articles set content = summary where content is null;
alter table public.strategy_articles alter column content set not null;

create unique index if not exists strategy_articles_slug_unique_idx on public.strategy_articles(slug);
create index if not exists idx_strategy_articles_category on public.strategy_articles(category);
create index if not exists idx_strategy_articles_active on public.strategy_articles(is_active);

-- 11. Logs
-- Do not store sensitive information such as passwords, tokens, addresses, or raw personal identifiers in log messages.
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  path text not null,
  method text not null,
  message text not null,
  code text,
  created_at timestamptz not null default now()
);

update public.error_logs set path = 'unknown' where path is null;
update public.error_logs set method = 'UNKNOWN' where method is null;
alter table public.error_logs alter column path set not null;
alter table public.error_logs alter column method set not null;

create index if not exists idx_error_logs_user_id on public.error_logs(user_id);
create index if not exists idx_error_logs_created_at on public.error_logs(created_at);

create table if not exists public.not_found_logs (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_not_found_logs_path on public.not_found_logs(path);
create index if not exists idx_not_found_logs_created_at on public.not_found_logs(created_at);

-- triggers for updated_at
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_creator_profiles_updated_at on public.creator_profiles;
create trigger set_creator_profiles_updated_at
before update on public.creator_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_user_plans_updated_at on public.user_plans;
create trigger set_user_plans_updated_at
before update on public.user_plans
for each row execute function public.set_updated_at();

drop trigger if exists set_trends_updated_at on public.trends;
create trigger set_trends_updated_at
before update on public.trends
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_addresses_updated_at on public.addresses;
create trigger set_addresses_updated_at
before update on public.addresses
for each row execute function public.set_updated_at();

drop trigger if exists set_service_contents_updated_at on public.service_contents;
create trigger set_service_contents_updated_at
before update on public.service_contents
for each row execute function public.set_updated_at();

drop trigger if exists set_sample_recommendations_updated_at on public.sample_recommendations;
create trigger set_sample_recommendations_updated_at
before update on public.sample_recommendations
for each row execute function public.set_updated_at();

drop trigger if exists set_strategy_articles_updated_at on public.strategy_articles;
create trigger set_strategy_articles_updated_at
before update on public.strategy_articles
for each row execute function public.set_updated_at();
