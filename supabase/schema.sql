-- Be Celeb Supabase schema draft for production setup.
-- TODO: Review indexes, enum strategy, and migration ownership before applying in production.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  display_name text not null,
  handle text not null unique,
  primary_category text not null,
  platforms text[] not null default '{}',
  goals text[] not null default '{}',
  follower_range text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trends (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null,
  platforms text[] not null default '{}',
  score integer not null default 0 check (score >= 0 and score <= 100),
  growth_rate integer not null default 0,
  direction text not null default 'watch',
  tags text[] not null default '{}',
  predicted_peak date,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trend_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rule_type text not null,
  category text,
  platform text,
  weight numeric(5, 2) not null default 1.0,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  reason text not null,
  hook_text text not null,
  content_plan text[] not null default '{}',
  hashtags text[] not null default '{}',
  upload_time text,
  difficulty text not null default '보통',
  expected_score integer not null default 0 check (expected_score >= 0 and expected_score <= 100),
  source text not null default 'openai',
  created_at timestamptz not null default now()
);

create table if not exists public.saved_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recommendation_id)
);

create index if not exists trends_category_idx on public.trends(category);
create index if not exists recommendations_user_id_idx on public.recommendations(user_id);
create index if not exists saved_recommendations_user_id_idx on public.saved_recommendations(user_id);
