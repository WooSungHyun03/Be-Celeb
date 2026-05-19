-- Favorites, content calendar, recommendation option persistence, and growth snapshots.

alter table public.favorites
  add column if not exists recommendation_id uuid references public.content_recommendations(id) on delete set null,
  add column if not exists reason text,
  add column if not exists hashtags text[],
  add column if not exists storyboard jsonb,
  add column if not exists source jsonb,
  add column if not exists updated_at timestamptz not null default now();

update public.favorites
set recommendation_id = target_id
where recommendation_id is null
  and type = 'recommendation'
  and exists (
    select 1
    from public.content_recommendations
    where content_recommendations.id = favorites.target_id
  );

update public.favorites
set source = metadata
where source is null
  and metadata is not null;

create unique index if not exists favorites_user_recommendation_unique_idx
on public.favorites(user_id, recommendation_id)
where recommendation_id is not null;

drop trigger if exists set_favorites_updated_at on public.favorites;
create trigger set_favorites_updated_at
before update on public.favorites
for each row execute function public.set_updated_at();

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  favorite_id uuid references public.favorites(id) on delete set null,
  title text not null,
  description text,
  scheduled_date date not null,
  start_time time,
  end_time time,
  status text not null default 'planned',
  platform text not null default 'youtube',
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_status_check check (status in ('planned', 'scripted', 'filmed', 'edited', 'uploaded'))
);

create index if not exists idx_calendar_events_user_date
on public.calendar_events(user_id, scheduled_date);

drop trigger if exists set_calendar_events_updated_at on public.calendar_events;
create trigger set_calendar_events_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

create table if not exists public.channel_growth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  youtube_channel_id text not null,
  channel_url text,
  subscriber_count bigint,
  view_count bigint,
  video_count bigint,
  recent_video_stats jsonb,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_channel_growth_snapshots_user_collected
on public.channel_growth_snapshots(user_id, collected_at desc);

alter table public.calendar_events enable row level security;
alter table public.channel_growth_snapshots enable row level security;

drop policy if exists "calendar_events_select_own" on public.calendar_events;
drop policy if exists "calendar_events_insert_own" on public.calendar_events;
drop policy if exists "calendar_events_update_own" on public.calendar_events;
drop policy if exists "calendar_events_delete_own" on public.calendar_events;

create policy "calendar_events_select_own"
on public.calendar_events for select
using (auth.uid() = user_id);

create policy "calendar_events_insert_own"
on public.calendar_events for insert
with check (auth.uid() = user_id);

create policy "calendar_events_update_own"
on public.calendar_events for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "calendar_events_delete_own"
on public.calendar_events for delete
using (auth.uid() = user_id);

drop policy if exists "channel_growth_snapshots_select_own" on public.channel_growth_snapshots;
drop policy if exists "channel_growth_snapshots_insert_own" on public.channel_growth_snapshots;

create policy "channel_growth_snapshots_select_own"
on public.channel_growth_snapshots for select
using (auth.uid() = user_id);

create policy "channel_growth_snapshots_insert_own"
on public.channel_growth_snapshots for insert
with check (auth.uid() = user_id);

grant select, insert, update, delete on public.calendar_events to authenticated, service_role;
grant select, insert on public.channel_growth_snapshots to authenticated;
grant select, insert, delete on public.channel_growth_snapshots to service_role;
