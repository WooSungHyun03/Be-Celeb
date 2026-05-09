-- Be Celeb Supabase schema
-- Priority 1 MVP tables

create extension if not exists "pgcrypto";

drop table if exists public.saved_recommendations cascade;
drop table if exists public.recommendations cascade;
drop table if exists public.trend_rules cascade;
drop table if exists public.user_profiles cascade;
drop table if exists public.users cascade;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nickname text,
  instagram_username text,
  avatar_url text,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

drop table if exists public.trends cascade;

create table if not exists public.trends (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null,
  category text,
  summary text,
  keywords text[] not null default '{}',
  hashtags text[] not null default '{}',
  thumbnail_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_nickname on public.profiles(nickname);

create index if not exists idx_creator_profiles_user_id on public.creator_profiles(user_id);
create index if not exists idx_creator_profiles_onboarding_completed on public.creator_profiles(onboarding_completed);

create index if not exists idx_user_plans_user_id on public.user_plans(user_id);
create index if not exists idx_user_plans_plan_name on public.user_plans(plan_name);

create index if not exists idx_trends_type on public.trends(type);
create index if not exists idx_trends_category on public.trends(category);
create index if not exists idx_trends_is_active on public.trends(is_active);

create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_is_active on public.products(is_active);

create index if not exists idx_favorites_user_id on public.favorites(user_id);