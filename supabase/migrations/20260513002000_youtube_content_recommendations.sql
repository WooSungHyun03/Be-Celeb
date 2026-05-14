-- YouTube creator recommendation workflow tables.

create table if not exists public.creator_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists creator_categories_name_unique_idx
on public.creator_categories(name);

insert into public.creator_categories (name)
values
  ('게임'),
  ('운동'),
  ('IT'),
  ('노래'),
  ('OTT'),
  ('일상'),
  ('뷰티'),
  ('스터디'),
  ('코미디'),
  ('먹방'),
  ('춤')
on conflict (name) do nothing;

create table if not exists public.influencer_channels (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.creator_categories(id) on delete cascade,
  youtube_channel_id text not null,
  channel_title text not null,
  channel_url text,
  description text,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, youtube_channel_id)
);

create index if not exists idx_influencer_channels_category_id
on public.influencer_channels(category_id);

create index if not exists idx_influencer_channels_youtube_channel_id
on public.influencer_channels(youtube_channel_id);

create table if not exists public.influencer_videos (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.creator_categories(id) on delete cascade,
  influencer_channel_id uuid not null references public.influencer_channels(id) on delete cascade,
  youtube_video_id text not null,
  youtube_channel_id text not null,
  published_at timestamptz not null,
  title text not null,
  description text,
  thumbnails jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists influencer_videos_youtube_video_id_unique_idx
on public.influencer_videos(youtube_video_id);

create index if not exists idx_influencer_videos_category_published_at
on public.influencer_videos(category_id, published_at desc);

create index if not exists idx_influencer_videos_channel_id
on public.influencer_videos(influencer_channel_id);

create table if not exists public.user_channel_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  channel_url text not null,
  youtube_channel_id text not null,
  channel_title text not null,
  selected_category text,
  inferred_category text,
  channel_data jsonb not null default '{}'::jsonb,
  recent_videos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_channel_analyses_user_id
on public.user_channel_analyses(user_id);

create index if not exists idx_user_channel_analyses_youtube_channel_id
on public.user_channel_analyses(youtube_channel_id);

create index if not exists idx_user_channel_analyses_created_at
on public.user_channel_analyses(created_at desc);

create table if not exists public.content_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  analysis_id uuid not null references public.user_channel_analyses(id) on delete cascade,
  selected_category text not null,
  input_payload jsonb not null default '{}'::jsonb,
  llm_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_content_recommendations_user_id
on public.content_recommendations(user_id);

create index if not exists idx_content_recommendations_analysis_id
on public.content_recommendations(analysis_id);

create index if not exists idx_content_recommendations_created_at
on public.content_recommendations(created_at desc);

drop trigger if exists set_influencer_channels_updated_at on public.influencer_channels;
create trigger set_influencer_channels_updated_at
before update on public.influencer_channels
for each row execute function public.set_updated_at();

alter table public.creator_categories enable row level security;
alter table public.influencer_channels enable row level security;
alter table public.influencer_videos enable row level security;
alter table public.user_channel_analyses enable row level security;
alter table public.content_recommendations enable row level security;

drop policy if exists "creator_categories_select_public" on public.creator_categories;
drop policy if exists "influencer_channels_select_public" on public.influencer_channels;
drop policy if exists "influencer_videos_select_public" on public.influencer_videos;
drop policy if exists "user_channel_analyses_select_own" on public.user_channel_analyses;
drop policy if exists "content_recommendations_select_own" on public.content_recommendations;

create policy "creator_categories_select_public"
on public.creator_categories for select
using (true);

create policy "influencer_channels_select_public"
on public.influencer_channels for select
using (true);

create policy "influencer_videos_select_public"
on public.influencer_videos for select
using (true);

create policy "user_channel_analyses_select_own"
on public.user_channel_analyses for select
using (auth.uid() = user_id);

create policy "content_recommendations_select_own"
on public.content_recommendations for select
using (auth.uid() = user_id);

grant select on public.creator_categories to anon, authenticated;
grant select on public.influencer_channels to anon, authenticated;
grant select on public.influencer_videos to anon, authenticated;
grant select on public.user_channel_analyses to authenticated;
grant select on public.content_recommendations to authenticated;
