-- Be Celeb RLS policies
-- Final feedback fixed version

alter table public.profiles enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.user_plans enable row level security;
alter table public.trends enable row level security;
alter table public.products enable row level security;
alter table public.favorites enable row level security;
alter table public.addresses enable row level security;
alter table public.service_contents enable row level security;
alter table public.sample_recommendations enable row level security;
alter table public.strategy_articles enable row level security;
alter table public.error_logs enable row level security;
alter table public.not_found_logs enable row level security;
alter table public.influencers enable row level security;
alter table public.reels enable row level security;
alter table public.recommendation_requests enable row level security;
alter table public.recommendations enable row level security;



-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- creator_profiles
DROP POLICY IF EXISTS "creator_profiles_select_own" ON public.creator_profiles;
DROP POLICY IF EXISTS "creator_profiles_insert_own" ON public.creator_profiles;
DROP POLICY IF EXISTS "creator_profiles_update_own" ON public.creator_profiles;

CREATE POLICY "creator_profiles_select_own"
ON public.creator_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "creator_profiles_insert_own"
ON public.creator_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "creator_profiles_update_own"
ON public.creator_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- user_plans: users can read only their own plan. Mutation is reserved for service role.
DROP POLICY IF EXISTS "user_plans_select_own" ON public.user_plans;

CREATE POLICY "user_plans_select_own"
ON public.user_plans FOR SELECT
USING (auth.uid() = user_id);

-- favorites
DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_update_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;

CREATE POLICY "favorites_select_own"
ON public.favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own"
ON public.favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_update_own"
ON public.favorites FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own"
ON public.favorites FOR DELETE
USING (auth.uid() = user_id);

-- addresses
DROP POLICY IF EXISTS "addresses_select_own" ON public.addresses;
DROP POLICY IF EXISTS "addresses_insert_own" ON public.addresses;
DROP POLICY IF EXISTS "addresses_update_own" ON public.addresses;
DROP POLICY IF EXISTS "addresses_delete_own" ON public.addresses;

CREATE POLICY "addresses_select_own"
ON public.addresses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "addresses_insert_own"
ON public.addresses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_update_own"
ON public.addresses FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_delete_own"
ON public.addresses FOR DELETE
USING (auth.uid() = user_id);

-- Public content tables: readable by anon/authenticated when active.
DROP POLICY IF EXISTS "trends_select_active" ON public.trends;
DROP POLICY IF EXISTS "products_select_active" ON public.products;
DROP POLICY IF EXISTS "service_contents_select_active" ON public.service_contents;
DROP POLICY IF EXISTS "sample_recommendations_select_active" ON public.sample_recommendations;
DROP POLICY IF EXISTS "strategy_articles_select_active" ON public.strategy_articles;

CREATE POLICY "trends_select_active"
ON public.trends FOR SELECT
USING (is_active = true);

CREATE POLICY "products_select_active"
ON public.products FOR SELECT
USING (is_active = true);

CREATE POLICY "service_contents_select_active"
ON public.service_contents FOR SELECT
USING (is_active = true);

CREATE POLICY "sample_recommendations_select_active"
ON public.sample_recommendations FOR SELECT
USING (is_active = true);

CREATE POLICY "strategy_articles_select_active"
ON public.strategy_articles FOR SELECT
USING (is_active = true);

-- Logs: allow insert only. No select policy is defined until admin role is implemented.
DROP POLICY IF EXISTS "error_logs_insert" ON public.error_logs;
DROP POLICY IF EXISTS "not_found_logs_insert" ON public.not_found_logs;

CREATE POLICY "error_logs_insert"
ON public.error_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "not_found_logs_insert"
ON public.not_found_logs FOR INSERT
WITH CHECK (true);

-- Influencers / reels: public mock analysis data.
DROP POLICY IF EXISTS "influencers_select_public" ON public.influencers;
DROP POLICY IF EXISTS "reels_select_public" ON public.reels;

CREATE POLICY "influencers_select_public"
ON public.influencers FOR SELECT
USING (true);

CREATE POLICY "reels_select_public"
ON public.reels FOR SELECT
USING (true);

-- Recommendation requests: users can create and read only their own requests.
DROP POLICY IF EXISTS "recommendation_requests_select_own" ON public.recommendation_requests;
DROP POLICY IF EXISTS "recommendation_requests_insert_own" ON public.recommendation_requests;

CREATE POLICY "recommendation_requests_select_own"
ON public.recommendation_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "recommendation_requests_insert_own"
ON public.recommendation_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Recommendations: users can read their own results. Insert/update is reserved for service role.
DROP POLICY IF EXISTS "recommendations_select_own" ON public.recommendations;

CREATE POLICY "recommendations_select_own"
ON public.recommendations FOR SELECT
USING (auth.uid() = user_id);


-- Explicit grants for Supabase anon/authenticated roles.
GRANT SELECT ON public.trends TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.service_contents TO anon, authenticated;
GRANT SELECT ON public.sample_recommendations TO anon, authenticated;
GRANT SELECT ON public.strategy_articles TO anon, authenticated;
GRANT SELECT ON public.influencers TO anon, authenticated;
GRANT SELECT ON public.reels TO anon, authenticated;
GRANT SELECT, INSERT ON public.recommendation_requests TO authenticated;
GRANT SELECT ON public.recommendations TO authenticated;
GRANT INSERT ON public.error_logs TO anon, authenticated;
GRANT INSERT ON public.not_found_logs TO anon, authenticated;
