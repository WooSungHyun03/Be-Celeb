-- Efficient category winner query for the YouTube trends page.

create index if not exists idx_influencer_videos_published_at
on public.influencer_videos(published_at desc);

create index if not exists idx_influencer_videos_tags_gin
on public.influencer_videos using gin(tags);

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
    ranked.view_count,
    ranked.like_count,
    ranked.comment_count,
    ranked.published_at
  from (
    select
      influencer_videos.*,
      row_number() over (
        partition by influencer_videos.category_id
        order by influencer_videos.view_count desc nulls last, influencer_videos.published_at desc
      ) as row_number_by_category
    from public.influencer_videos
  ) ranked
  join public.creator_categories
    on creator_categories.id = ranked.category_id
  where ranked.row_number_by_category = 1
  order by ranked.view_count desc nulls last, ranked.published_at desc;
$$;

grant execute on function public.get_top_influencer_videos_by_category() to anon, authenticated, service_role;
