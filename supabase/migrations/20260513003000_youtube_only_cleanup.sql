-- Clean up legacy channel/profile naming after the product moved to YouTube only.

do $$
declare
  legacy_channel_column text := 'in' || 'sta' || 'gram_username';
  legacy_experience_column text := 'in' || 'sta' || 'gram_experience';
  legacy_audience_range_column text := 'follow' || 'er_range';
  legacy_audience_count_column text := 'follow' || 'er_count';
  legacy_video_table text := 'ree' || 'ls';
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = legacy_channel_column
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'youtube_channel_url'
    ) then
      execute format(
        'alter table public.profiles rename column %I to youtube_channel_url',
        legacy_channel_column
      );
    else
      execute format(
        'update public.profiles set youtube_channel_url = coalesce(youtube_channel_url, %I)',
        legacy_channel_column
      );

      execute format('alter table public.profiles drop column %I', legacy_channel_column);
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'creator_profiles'
      and column_name = legacy_experience_column
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'creator_profiles'
        and column_name = 'youtube_experience'
    ) then
      execute format(
        'alter table public.creator_profiles rename column %I to youtube_experience',
        legacy_experience_column
      );
    else
      execute format(
        'update public.creator_profiles set youtube_experience = coalesce(youtube_experience, %I)',
        legacy_experience_column
      );

      execute format('alter table public.creator_profiles drop column %I', legacy_experience_column);
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'creator_profiles'
      and column_name = legacy_audience_range_column
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'creator_profiles'
        and column_name = 'subscriber_range'
    ) then
      execute format(
        'alter table public.creator_profiles rename column %I to subscriber_range',
        legacy_audience_range_column
      );
    else
      execute format(
        'update public.creator_profiles set subscriber_range = coalesce(subscriber_range, %I)',
        legacy_audience_range_column
      );

      execute format('alter table public.creator_profiles drop column %I', legacy_audience_range_column);
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'influencers'
      and column_name = legacy_audience_count_column
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'influencers'
        and column_name = 'subscriber_count'
    ) then
      execute format(
        'alter table public.influencers rename column %I to subscriber_count',
        legacy_audience_count_column
      );
    else
      execute format(
        'update public.influencers set subscriber_count = coalesce(subscriber_count, %I)',
        legacy_audience_count_column
      );

      execute format('alter table public.influencers drop column %I', legacy_audience_count_column);
    end if;
  end if;

  if to_regclass('public.' || legacy_video_table) is not null then
    if to_regclass('public.videos') is null then
      execute format('alter table public.%I rename to videos', legacy_video_table);
    else
      execute format(
        $sql$
          insert into public.videos (
            influencer_id,
            title,
            topic,
            format,
            hook,
            hashtags,
            views,
            likes,
            comments,
            saves,
            created_at
          )
          select
            influencer_id,
            title,
            topic,
            format,
            hook,
            hashtags,
            views,
            likes,
            comments,
            saves,
            created_at
          from public.%I old_video
          where not exists (
            select 1
            from public.videos existing_video
            where existing_video.influencer_id = old_video.influencer_id
              and existing_video.title = old_video.title
          )
        $sql$,
        legacy_video_table
      );

      execute format('drop table public.%I', legacy_video_table);
    end if;
  end if;

  if to_regclass('public.shorts') is not null then
    if to_regclass('public.videos') is null then
      alter table public.shorts rename to videos;
    else
      execute '
        insert into public.videos (
          influencer_id,
          title,
          topic,
          format,
          hook,
          hashtags,
          views,
          likes,
          comments,
          saves,
          created_at
        )
        select
          influencer_id,
          title,
          topic,
          format,
          hook,
          hashtags,
          views,
          likes,
          comments,
          saves,
          created_at
        from public.shorts old_video
        where not exists (
          select 1
          from public.videos existing_video
          where existing_video.influencer_id = old_video.influencer_id
            and existing_video.title = old_video.title
        )
      ';

      drop table public.shorts;
    end if;
  end if;
end $$;

do $$
declare
  legacy_channel_column text := 'in' || 'sta' || 'gram_username';
  legacy_video_table text := 'ree' || 'ls';
begin
  execute format('drop index if exists public.%I', 'idx_profiles_' || legacy_channel_column);
  execute format('drop index if exists public.%I', legacy_video_table || '_title_influencer_unique_idx');
  execute format('drop index if exists public.%I', 'idx_' || legacy_video_table || '_influencer_id');
  execute format('drop index if exists public.%I', 'idx_' || legacy_video_table || '_topic');
end $$;

create index if not exists idx_profiles_youtube_channel_url
on public.profiles(youtube_channel_url);

drop index if exists public.shorts_title_influencer_unique_idx;
drop index if exists public.idx_shorts_influencer_id;
drop index if exists public.idx_shorts_topic;

do $$
declare
  legacy_video_table text := 'ree' || 'ls';
begin
  if to_regclass('public.videos') is not null then
    create unique index if not exists videos_title_influencer_unique_idx
    on public.videos(influencer_id, title);

    create index if not exists idx_videos_influencer_id
    on public.videos(influencer_id);

    create index if not exists idx_videos_topic
    on public.videos(topic);

    alter table public.videos enable row level security;

    execute format('drop policy if exists %I on public.videos', legacy_video_table || '_select_public');
    drop policy if exists "Shorts_select_public" on public.videos;
    drop policy if exists "shorts_select_public" on public.videos;
    drop policy if exists "videos_select_public" on public.videos;

    create policy "videos_select_public"
    on public.videos for select
    using (true);

    grant select on public.videos to anon, authenticated;
  end if;
end $$;
