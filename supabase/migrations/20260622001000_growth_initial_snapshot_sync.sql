-- Ensure newly connected dashboard channels can create one growth snapshot per day
-- and keep enough channel metadata for the growth report UI.

alter table public.channel_growth_snapshots
  add column if not exists channel_title text,
  add column if not exists channel_thumbnail_url text;

update public.channel_growth_snapshots snapshots
set
  channel_title = coalesce(snapshots.channel_title, settings.channel_title),
  channel_thumbnail_url = coalesce(snapshots.channel_thumbnail_url, settings.channel_thumbnail_url)
from public.user_channel_settings settings
where snapshots.user_id = settings.user_id
  and snapshots.youtube_channel_id = settings.youtube_channel_id;

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, youtube_channel_id, ((collected_at at time zone 'utc')::date)
      order by collected_at desc, created_at desc, id desc
    ) as rn
  from public.channel_growth_snapshots
)
delete from public.channel_growth_snapshots
where id in (
  select id
  from ranked
  where rn > 1
);

create unique index if not exists channel_growth_snapshots_user_channel_day_unique_idx
on public.channel_growth_snapshots(user_id, youtube_channel_id, ((collected_at at time zone 'utc')::date));

grant select, insert, update, delete on public.channel_growth_snapshots to service_role;
