-- Daily YouTube influencer collection support.

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

alter table public.influencer_channels
  add column if not exists is_active boolean not null default true;

alter table public.influencer_channels
  alter column youtube_channel_id drop not null;

alter table public.influencer_channels
  alter column channel_title drop not null;

alter table public.influencer_channels
  add column if not exists description text,
  add column if not exists thumbnail_url text,
  add column if not exists updated_at timestamptz not null default now();

update public.influencer_channels
set channel_url = 'https://www.youtube.com/channel/' || youtube_channel_id
where channel_url is null
  and youtube_channel_id is not null;

create unique index if not exists influencer_channels_category_channel_url_unique_idx
on public.influencer_channels(category_id, channel_url)
where channel_url is not null;

drop trigger if exists set_influencer_channels_updated_at on public.influencer_channels;
create trigger set_influencer_channels_updated_at
before update on public.influencer_channels
for each row execute function public.set_updated_at();

alter table public.influencer_videos
  add column if not exists collected_at timestamptz not null default now();

create table if not exists public.collection_logs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_collection_logs_job_started_at
on public.collection_logs(job_name, started_at desc);

alter table public.collection_logs enable row level security;

grant select, insert, update on public.collection_logs to service_role;
