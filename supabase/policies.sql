-- Be Celeb RLS policies
-- Priority 1 MVP tables

alter table public.profiles enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.user_plans enable row level security;
alter table public.trends enable row level security;
alter table public.products enable row level security;
alter table public.favorites enable row level security;

create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = user_id);

create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = user_id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "creator_profiles_select_own"
on public.creator_profiles for select
using (auth.uid() = user_id);

create policy "creator_profiles_insert_own"
on public.creator_profiles for insert
with check (auth.uid() = user_id);

create policy "creator_profiles_update_own"
on public.creator_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_plans_select_own"
on public.user_plans for select
using (auth.uid() = user_id);

create policy "trends_select_active"
on public.trends for select
using (is_active = true);

create policy "products_select_active"
on public.products for select
using (is_active = true);

create policy "favorites_select_own"
on public.favorites for select
using (auth.uid() = user_id);

create policy "favorites_insert_own"
on public.favorites for insert
with check (auth.uid() = user_id);

create policy "favorites_update_own"
on public.favorites for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "favorites_delete_own"
on public.favorites for delete
using (auth.uid() = user_id);