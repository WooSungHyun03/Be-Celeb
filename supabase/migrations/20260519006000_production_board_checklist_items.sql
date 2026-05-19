-- Checklist items for production board cards.

create table if not exists public.production_board_checklist_items (
  id uuid primary key default gen_random_uuid(),
  board_item_id uuid not null references public.production_board_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  is_done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_production_board_checklist_items_board_sort
on public.production_board_checklist_items(board_item_id, sort_order, created_at);

create index if not exists idx_production_board_checklist_items_user
on public.production_board_checklist_items(user_id);

drop trigger if exists set_production_board_checklist_items_updated_at on public.production_board_checklist_items;
create trigger set_production_board_checklist_items_updated_at
before update on public.production_board_checklist_items
for each row execute function public.set_updated_at();

alter table public.production_board_checklist_items enable row level security;

drop policy if exists "production_board_checklist_items_select_own" on public.production_board_checklist_items;
drop policy if exists "production_board_checklist_items_insert_own" on public.production_board_checklist_items;
drop policy if exists "production_board_checklist_items_update_own" on public.production_board_checklist_items;
drop policy if exists "production_board_checklist_items_delete_own" on public.production_board_checklist_items;

create policy "production_board_checklist_items_select_own"
on public.production_board_checklist_items for select
using (auth.uid() = user_id);

create policy "production_board_checklist_items_insert_own"
on public.production_board_checklist_items for insert
with check (auth.uid() = user_id);

create policy "production_board_checklist_items_update_own"
on public.production_board_checklist_items for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "production_board_checklist_items_delete_own"
on public.production_board_checklist_items for delete
using (auth.uid() = user_id);

grant select, insert, update, delete on public.production_board_checklist_items to authenticated, service_role;
