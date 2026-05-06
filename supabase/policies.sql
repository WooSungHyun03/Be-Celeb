-- Be Celeb RLS policy draft.
-- TODO: Review with the team before production launch, especially admin/service-role flows.

alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.trends enable row level security;
alter table public.trend_rules enable row level security;
alter table public.recommendations enable row level security;
alter table public.saved_recommendations enable row level security;

create policy "Users can read own user row"
on public.users
for select
using (auth.uid() = id);

create policy "Users can update own user row"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can read own profile"
on public.user_profiles
for select
using (auth.uid() = user_id);

create policy "Users can insert own profile"
on public.user_profiles
for insert
with check (auth.uid() = user_id);

create policy "Users can update own profile"
on public.user_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Authenticated users can read trends"
on public.trends
for select
to authenticated
using (true);

create policy "Authenticated users can read active trend rules"
on public.trend_rules
for select
to authenticated
using (is_active = true);

create policy "Users can read own recommendations"
on public.recommendations
for select
using (auth.uid() = user_id);

create policy "Users can insert own recommendations"
on public.recommendations
for insert
with check (auth.uid() = user_id);

create policy "Users can read own saved recommendations"
on public.saved_recommendations
for select
using (auth.uid() = user_id);

create policy "Users can save own recommendations"
on public.saved_recommendations
for insert
with check (auth.uid() = user_id);

create policy "Users can delete own saved recommendations"
on public.saved_recommendations
for delete
using (auth.uid() = user_id);
