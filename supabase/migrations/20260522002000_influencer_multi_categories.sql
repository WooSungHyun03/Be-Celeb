-- Allow influencer channels and videos to belong to multiple creator categories.

create table if not exists public.influencer_channel_categories (
  id uuid primary key default gen_random_uuid(),
  influencer_channel_id uuid not null references public.influencer_channels(id) on delete cascade,
  category_id uuid not null references public.creator_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (influencer_channel_id, category_id)
);

create table if not exists public.influencer_video_categories (
  id uuid primary key default gen_random_uuid(),
  influencer_video_id uuid not null references public.influencer_videos(id) on delete cascade,
  category_id uuid not null references public.creator_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (influencer_video_id, category_id)
);

create index if not exists idx_influencer_channel_categories_channel_id
on public.influencer_channel_categories(influencer_channel_id);

create index if not exists idx_influencer_channel_categories_category_id
on public.influencer_channel_categories(category_id);

create index if not exists idx_influencer_video_categories_video_id
on public.influencer_video_categories(influencer_video_id);

create index if not exists idx_influencer_video_categories_category_id
on public.influencer_video_categories(category_id);

insert into public.influencer_channel_categories (influencer_channel_id, category_id)
select id, category_id
from public.influencer_channels
where category_id is not null
on conflict (influencer_channel_id, category_id) do nothing;

insert into public.influencer_video_categories (influencer_video_id, category_id)
select id, category_id
from public.influencer_videos
where category_id is not null
on conflict (influencer_video_id, category_id) do nothing;

alter table public.influencer_channel_categories enable row level security;
alter table public.influencer_video_categories enable row level security;

drop policy if exists "influencer_channel_categories_select_public" on public.influencer_channel_categories;
drop policy if exists "influencer_video_categories_select_public" on public.influencer_video_categories;

create policy "influencer_channel_categories_select_public"
on public.influencer_channel_categories for select
using (true);

create policy "influencer_video_categories_select_public"
on public.influencer_video_categories for select
using (true);

grant select on public.influencer_channel_categories to anon, authenticated;
grant select on public.influencer_video_categories to anon, authenticated;
grant select, insert, update, delete on public.influencer_channel_categories to service_role;
grant select, insert, update, delete on public.influencer_video_categories to service_role;

create or replace function public.get_top_influencer_videos_by_category()
returns table (
  category text,
  youtube_video_id text,
  title text,
  description text,
  thumbnail_url text,
  tags text[],
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with video_categories as (
    select
      influencer_video_categories.influencer_video_id,
      influencer_video_categories.category_id
    from public.influencer_video_categories
    union
    select
      influencer_videos.id as influencer_video_id,
      influencer_videos.category_id
    from public.influencer_videos
    where influencer_videos.category_id is not null
  ),
  ranked as (
    select
      influencer_videos.*,
      video_categories.category_id as ranked_category_id,
      row_number() over (
        partition by video_categories.category_id
        order by influencer_videos.view_count desc nulls last, influencer_videos.published_at desc nulls last
      ) as row_number_by_category
    from public.influencer_videos
    join video_categories
      on video_categories.influencer_video_id = influencer_videos.id
  )
  select
    creator_categories.name as category,
    ranked.youtube_video_id,
    ranked.title,
    coalesce(ranked.description, '') as description,
    coalesce(
      ranked.thumbnails -> 'maxres' ->> 'url',
      ranked.thumbnails -> 'standard' ->> 'url',
      ranked.thumbnails -> 'high' ->> 'url',
      ranked.thumbnails -> 'medium' ->> 'url',
      ranked.thumbnails -> 'default' ->> 'url'
    ) as thumbnail_url,
    coalesce(ranked.tags, '{}'::text[]) as tags,
    coalesce(ranked.view_count, 0) as view_count,
    coalesce(ranked.like_count, 0) as like_count,
    coalesce(ranked.comment_count, 0) as comment_count,
    ranked.published_at
  from ranked
  join public.creator_categories
    on creator_categories.id = ranked.ranked_category_id
  where ranked.row_number_by_category = 1
  order by ranked.view_count desc nulls last, ranked.published_at desc nulls last;
$$;

grant execute on function public.get_top_influencer_videos_by_category() to anon, authenticated, service_role;
