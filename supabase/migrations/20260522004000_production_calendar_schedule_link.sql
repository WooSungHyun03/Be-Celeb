-- Production board direct items and calendar shooting schedule linkage.

alter table public.calendar_events
  add column if not exists color text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists production_item_id uuid references public.production_board_items(id) on delete set null;

update public.calendar_events
set start_date = coalesce(start_date, scheduled_date),
    end_date = coalesce(end_date, scheduled_date)
where start_date is null;

alter table public.calendar_events
  alter column start_date set not null;

alter table public.calendar_events
  drop constraint if exists calendar_events_status_check;

alter table public.calendar_events
  add constraint calendar_events_status_check
  check (status in ('planned', 'scripted', 'filmed', 'edited', 'uploaded', 'filming', 'editing', 'scheduled'));

create index if not exists idx_calendar_events_user_range
on public.calendar_events(user_id, start_date, end_date);

create index if not exists idx_calendar_events_production_item
on public.calendar_events(production_item_id);

alter table public.production_board_items
  add column if not exists calendar_event_id uuid references public.calendar_events(id) on delete set null,
  add column if not exists description text,
  add column if not exists shoot_start_date date,
  add column if not exists shoot_end_date date,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.production_board_items
  drop constraint if exists production_board_items_status_check;

alter table public.production_board_items
  add constraint production_board_items_status_check
  check (status in ('idea', 'script', 'planned', 'filming', 'editing', 'scheduled', 'uploaded'));

update public.production_board_items
set status = 'planned'
where status = 'script';

alter table public.production_board_items
  drop constraint if exists production_board_items_status_check;

alter table public.production_board_items
  add constraint production_board_items_status_check
  check (status in ('idea', 'planned', 'filming', 'editing', 'scheduled', 'uploaded'));

create index if not exists idx_production_board_items_user_shoot_dates
on public.production_board_items(user_id, shoot_start_date, shoot_end_date);

create index if not exists idx_production_board_items_calendar_event
on public.production_board_items(calendar_event_id);

create or replace view public.production_items
with (security_invoker = true)
as
select
  id,
  user_id,
  recommendation_id,
  favorite_id,
  calendar_event_id,
  title,
  description,
  hashtags,
  storyboard,
  status,
  shoot_start_date,
  shoot_end_date,
  metadata,
  created_at,
  updated_at
from public.production_board_items;

grant select on public.production_items to authenticated, service_role;
