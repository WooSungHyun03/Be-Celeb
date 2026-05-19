-- Ensure production board status transitions can use every supported MVP stage.

alter table public.production_board_items
  drop constraint if exists production_board_items_status_check;

alter table public.production_board_items
  add constraint production_board_items_status_check
  check (status in ('idea', 'script', 'filming', 'editing', 'uploaded'));

alter table public.production_board_items
  drop constraint if exists production_board_items_priority_check;

alter table public.production_board_items
  add constraint production_board_items_priority_check
  check (priority in ('low', 'normal', 'high'));

drop trigger if exists set_production_board_items_updated_at on public.production_board_items;
create trigger set_production_board_items_updated_at
before update on public.production_board_items
for each row execute function public.set_updated_at();
