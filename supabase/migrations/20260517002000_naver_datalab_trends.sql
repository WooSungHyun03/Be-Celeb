-- Naver DataLab search trend collection support.
-- DataLab ratio is a relative index for the requested keyword group and date range,
-- not an absolute search volume.

create table if not exists public.naver_trend_keyword_groups (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.creator_categories(id) on delete set null,
  category_name text not null,
  title text not null,
  keywords text[] not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint naver_trend_keyword_groups_keywords_not_empty check (array_length(keywords, 1) > 0)
);

create unique index if not exists naver_trend_keyword_groups_category_title_unique_idx
on public.naver_trend_keyword_groups(category_name, title);

create index if not exists idx_naver_trend_keyword_groups_category_active
on public.naver_trend_keyword_groups(category_name, is_active);

drop trigger if exists set_naver_trend_keyword_groups_updated_at on public.naver_trend_keyword_groups;
create trigger set_naver_trend_keyword_groups_updated_at
before update on public.naver_trend_keyword_groups
for each row execute function public.set_updated_at();

create table if not exists public.naver_trend_daily_points (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.naver_trend_keyword_groups(id) on delete cascade,
  category_name text not null,
  keyword_group_title text not null,
  period date not null,
  ratio numeric not null,
  time_unit text not null default 'date',
  start_date date not null,
  end_date date not null,
  raw jsonb,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(group_id, period, time_unit)
);

comment on column public.naver_trend_daily_points.ratio is
  'Naver DataLab relative search trend ratio, not absolute search volume.';

create index if not exists idx_naver_trend_daily_points_category_period
on public.naver_trend_daily_points(category_name, period desc);

create index if not exists idx_naver_trend_daily_points_group_period
on public.naver_trend_daily_points(group_id, period desc);

create table if not exists public.naver_trend_collection_logs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null default 'naver_datalab_daily_collection',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_naver_trend_collection_logs_started_at
on public.naver_trend_collection_logs(started_at desc);

with default_groups(category_name, title, keywords) as (
  values
    ('게임', '롤', array['롤']::text[]),
    ('게임', '발로란트', array['발로란트']::text[]),
    ('게임', '마인크래프트', array['마인크래프트']::text[]),
    ('게임', '로블록스', array['로블록스']::text[]),
    ('게임', '배그', array['배그']::text[]),
    ('운동', '헬스', array['헬스']::text[]),
    ('운동', '다이어트', array['다이어트']::text[]),
    ('운동', '러닝', array['러닝']::text[]),
    ('운동', '필라테스', array['필라테스']::text[]),
    ('운동', '단백질', array['단백질']::text[]),
    ('IT', 'AI', array['AI']::text[]),
    ('IT', 'ChatGPT', array['ChatGPT']::text[]),
    ('IT', '아이폰', array['아이폰']::text[]),
    ('IT', '갤럭시', array['갤럭시']::text[]),
    ('IT', '노트북', array['노트북']::text[]),
    ('IT', '코딩', array['코딩']::text[]),
    ('노래', '커버곡', array['커버곡']::text[]),
    ('노래', '보컬', array['보컬']::text[]),
    ('노래', '플레이리스트', array['플레이리스트']::text[]),
    ('노래', '노래방', array['노래방']::text[]),
    ('노래', '라이브', array['라이브']::text[]),
    ('OTT', '넷플릭스', array['넷플릭스']::text[]),
    ('OTT', '드라마', array['드라마']::text[]),
    ('OTT', '영화', array['영화']::text[]),
    ('OTT', '디즈니플러스', array['디즈니플러스']::text[]),
    ('OTT', '티빙', array['티빙']::text[]),
    ('일상', '브이로그', array['브이로그']::text[]),
    ('일상', '일상', array['일상']::text[]),
    ('일상', '루틴', array['루틴']::text[]),
    ('일상', '대학생', array['대학생']::text[]),
    ('일상', '직장인', array['직장인']::text[]),
    ('뷰티', '올리브영', array['올리브영']::text[]),
    ('뷰티', '선크림', array['선크림']::text[]),
    ('뷰티', '쿠션', array['쿠션']::text[]),
    ('뷰티', '피부관리', array['피부관리']::text[]),
    ('뷰티', '메이크업', array['메이크업']::text[]),
    ('스터디', '공부', array['공부']::text[]),
    ('스터디', '시험', array['시험']::text[]),
    ('스터디', '플래너', array['플래너']::text[]),
    ('스터디', '생산성', array['생산성']::text[]),
    ('스터디', '자격증', array['자격증']::text[]),
    ('코미디', '개그', array['개그']::text[]),
    ('코미디', '웃긴영상', array['웃긴영상']::text[]),
    ('코미디', '상황극', array['상황극']::text[]),
    ('코미디', '밈', array['밈']::text[]),
    ('코미디', '몰카', array['몰카']::text[]),
    ('먹방', '먹방', array['먹방']::text[]),
    ('먹방', '맛집', array['맛집']::text[]),
    ('먹방', '라면', array['라면']::text[]),
    ('먹방', '디저트', array['디저트']::text[]),
    ('먹방', '배달음식', array['배달음식']::text[]),
    ('춤', '댄스', array['댄스']::text[]),
    ('춤', '챌린지', array['챌린지']::text[]),
    ('춤', '안무', array['안무']::text[]),
    ('춤', '커버댄스', array['커버댄스']::text[]),
    ('춤', '아이돌댄스', array['아이돌댄스']::text[])
)
insert into public.naver_trend_keyword_groups (category_id, category_name, title, keywords, is_active)
select creator_categories.id, default_groups.category_name, default_groups.title, default_groups.keywords, true
from default_groups
left join public.creator_categories
  on creator_categories.name = default_groups.category_name
on conflict (category_name, title) do update set
  category_id = excluded.category_id,
  keywords = excluded.keywords,
  updated_at = now();

alter table public.naver_trend_keyword_groups enable row level security;
alter table public.naver_trend_daily_points enable row level security;
alter table public.naver_trend_collection_logs enable row level security;

drop policy if exists "naver_trend_keyword_groups_select_public" on public.naver_trend_keyword_groups;
drop policy if exists "naver_trend_daily_points_select_public" on public.naver_trend_daily_points;

create policy "naver_trend_keyword_groups_select_public"
on public.naver_trend_keyword_groups for select
using (is_active = true);

create policy "naver_trend_daily_points_select_public"
on public.naver_trend_daily_points for select
using (true);

grant select on public.naver_trend_keyword_groups to anon, authenticated;
grant select on public.naver_trend_daily_points to anon, authenticated;
grant select, insert, update, delete on public.naver_trend_keyword_groups to service_role;
grant select, insert, update, delete on public.naver_trend_daily_points to service_role;
grant select, insert, update on public.naver_trend_collection_logs to service_role;
