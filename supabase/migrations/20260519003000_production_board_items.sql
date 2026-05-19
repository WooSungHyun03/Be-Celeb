-- Production board items created from favorited recommendation ideas.

create table if not exists public.production_board_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  favorite_id uuid references public.favorites(id) on delete set null,
  recommendation_id uuid references public.content_recommendations(id) on delete set null,
  title text not null,
  hook text,
  reason text,
  hashtags text[] not null default '{}',
  storyboard jsonb,
  category text,
  status text not null default 'idea',
  priority text not null default 'normal',
  memo text,
  due_date date,
  upload_scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_board_items_status_check
    check (status in ('idea', 'script', 'filming', 'editing', 'uploaded')),
  constraint production_board_items_priority_check
    check (priority in ('low', 'normal', 'high'))
);

create index if not exists idx_production_board_items_user_status
on public.production_board_items(user_id, status);

create index if not exists idx_production_board_items_user_created
on public.production_board_items(user_id, created_at desc);

create unique index if not exists production_board_items_user_recommendation_unique_idx
on public.production_board_items(user_id, recommendation_id)
where recommendation_id is not null;

create unique index if not exists production_board_items_user_favorite_unique_idx
on public.production_board_items(user_id, favorite_id)
where favorite_id is not null;

drop trigger if exists set_production_board_items_updated_at on public.production_board_items;
create trigger set_production_board_items_updated_at
before update on public.production_board_items
for each row execute function public.set_updated_at();

alter table public.production_board_items enable row level security;

drop policy if exists "production_board_items_select_own" on public.production_board_items;
drop policy if exists "production_board_items_insert_own" on public.production_board_items;
drop policy if exists "production_board_items_update_own" on public.production_board_items;
drop policy if exists "production_board_items_delete_own" on public.production_board_items;

create policy "production_board_items_select_own"
on public.production_board_items for select
using (auth.uid() = user_id);

create policy "production_board_items_insert_own"
on public.production_board_items for insert
with check (auth.uid() = user_id);

create policy "production_board_items_update_own"
on public.production_board_items for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "production_board_items_delete_own"
on public.production_board_items for delete
using (auth.uid() = user_id);

grant select, insert, update, delete on public.production_board_items to authenticated, service_role;
