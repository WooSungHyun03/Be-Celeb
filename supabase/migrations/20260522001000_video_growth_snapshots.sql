-- Growth report video-level daily snapshots.
-- Channel change policy: when user_channel_settings points to a different
-- youtube_channel_id, backend deletes prior channel/video growth snapshots for
-- that user and starts a new series for the new channel.

alter table public.channel_growth_snapshots
  alter column subscriber_count set default 0,
  alter column view_count set default 0,
  alter column video_count set default 0;

update public.channel_growth_snapshots
set
  subscriber_count = coalesce(subscriber_count, 0),
  view_count = coalesce(view_count, 0),
  video_count = coalesce(video_count, 0);

alter table public.channel_growth_snapshots
  alter column subscriber_count set not null,
  alter column view_count set not null,
  alter column video_count set not null;

create table if not exists public.video_growth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  youtube_video_id text not null,
  youtube_channel_id text not null,
  title text,
  thumbnail_url text,
  published_at timestamptz,
  view_count bigint not null default 0,
  like_count bigint not null default 0,
  comment_count bigint not null default 0,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_video_growth_snapshots_user_video_collected
on public.video_growth_snapshots(user_id, youtube_video_id, collected_at desc);

create index if not exists idx_video_growth_snapshots_user_channel_collected
on public.video_growth_snapshots(user_id, youtube_channel_id, collected_at desc);

create unique index if not exists video_growth_snapshots_user_video_day_unique_idx
on public.video_growth_snapshots(user_id, youtube_video_id, ((collected_at at time zone 'utc')::date));

alter table public.video_growth_snapshots enable row level security;

drop policy if exists "video_growth_snapshots_select_own" on public.video_growth_snapshots;
drop policy if exists "video_growth_snapshots_insert_own" on public.video_growth_snapshots;

create policy "video_growth_snapshots_select_own"
on public.video_growth_snapshots for select
using (auth.uid() = user_id);

create policy "video_growth_snapshots_insert_own"
on public.video_growth_snapshots for insert
with check (auth.uid() = user_id);

grant select, insert on public.video_growth_snapshots to authenticated;
grant select, insert, update, delete on public.video_growth_snapshots to service_role;
