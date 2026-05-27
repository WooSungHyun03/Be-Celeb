-- Stores subtitle transcript outputs and derived storyboard metadata without saving source video files.

create table if not exists public.video_analysis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  influencer_video_id uuid references public.influencer_videos(id) on delete set null,
  youtube_video_id text,
  title text,
  video_url text,
  transcript text not null,
  transcript_segments jsonb not null default '[]'::jsonb,
  scene_summary text,
  storyboard_result jsonb,
  analysis_result jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_video_analysis_user_created
on public.video_analysis(user_id, created_at desc);

create unique index if not exists video_analysis_youtube_video_id_unique_idx
on public.video_analysis(youtube_video_id);

create index if not exists idx_video_analysis_influencer_video
on public.video_analysis(influencer_video_id);

alter table public.video_analysis enable row level security;

drop policy if exists "video_analysis_select_own" on public.video_analysis;
drop policy if exists "video_analysis_insert_own" on public.video_analysis;
drop policy if exists "video_analysis_update_own" on public.video_analysis;

create policy "video_analysis_select_own"
on public.video_analysis for select
using (auth.uid() = user_id);

create policy "video_analysis_insert_own"
on public.video_analysis for insert
with check (auth.uid() = user_id);

create policy "video_analysis_update_own"
on public.video_analysis for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.video_analysis to authenticated;
grant select, insert, update, delete on public.video_analysis to service_role;
