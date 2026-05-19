-- Naver Shopping product cache for creator shop.

create table if not exists public.creator_shop_keywords (
  id uuid primary key default gen_random_uuid(),
  creator_category text not null,
  shop_category text,
  keyword text not null,
  source text not null default 'naver',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_category, keyword, source)
);

create index if not exists idx_creator_shop_keywords_category_active
on public.creator_shop_keywords(creator_category, is_active);

drop trigger if exists set_creator_shop_keywords_updated_at on public.creator_shop_keywords;
create trigger set_creator_shop_keywords_updated_at
before update on public.creator_shop_keywords
for each row execute function public.set_updated_at();

create table if not exists public.creator_shop_products (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'naver',
  source_product_id text,
  title text not null,
  image_url text,
  price bigint,
  mall_name text,
  product_url text not null,
  brand text,
  maker text,
  category text,
  creator_category text not null,
  search_keyword text not null,
  raw jsonb,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists creator_shop_products_source_product_keyword_unique_idx
on public.creator_shop_products(source, source_product_id, creator_category, search_keyword);

create index if not exists idx_creator_shop_products_category_keyword
on public.creator_shop_products(creator_category, search_keyword);

create index if not exists idx_creator_shop_products_collected_at
on public.creator_shop_products(collected_at desc);

drop trigger if exists set_creator_shop_products_updated_at on public.creator_shop_products;
create trigger set_creator_shop_products_updated_at
before update on public.creator_shop_products
for each row execute function public.set_updated_at();

create table if not exists public.creator_shop_collection_logs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null default 'creator_shop_products_daily_collection',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_creator_shop_collection_logs_started_at
on public.creator_shop_collection_logs(started_at desc);

with default_keywords(creator_category, shop_category, keyword) as (
  values
    ('게임', '방송 장비', '게이밍 마이크'),
    ('게임', '방송 장비', '게이밍 헤드셋'),
    ('게임', '촬영 장비', '방송 조명'),
    ('운동', '촬영 장비', '운동 촬영 삼각대'),
    ('운동', '오디오', '무선 마이크'),
    ('운동', '촬영 장비', '러닝 카메라'),
    ('IT', '오디오', '유튜브 마이크'),
    ('IT', '촬영 장비', '리뷰 촬영 조명'),
    ('IT', '촬영 장비', '데스크 셋업 조명'),
    ('노래', '오디오', '보컬 마이크'),
    ('노래', '오디오', '오디오 인터페이스'),
    ('노래', '스튜디오', '방음 패널'),
    ('OTT', '오디오', '영화 리뷰 마이크'),
    ('OTT', '촬영 장비', '조명'),
    ('OTT', '촬영 장비', '웹캠'),
    ('일상', '촬영 장비', '브이로그 카메라'),
    ('일상', '촬영 장비', '미니 삼각대'),
    ('일상', '오디오', '무선 마이크'),
    ('뷰티', '촬영 장비', '메이크업 조명'),
    ('뷰티', '촬영 장비', '링라이트'),
    ('뷰티', '촬영 장비', '촬영 거울'),
    ('스터디', '촬영 장비', '스터디 조명'),
    ('스터디', '생산성', '타이머'),
    ('스터디', '오디오', '책상 마이크'),
    ('코미디', '오디오', '무선 마이크'),
    ('코미디', '촬영 장비', '촬영 삼각대'),
    ('코미디', '촬영 장비', '조명'),
    ('먹방', '촬영 장비', '먹방 조명'),
    ('먹방', '촬영 장비', '테이블 삼각대'),
    ('먹방', '오디오', '핀마이크'),
    ('춤', '촬영 장비', '댄스 촬영 삼각대'),
    ('춤', '촬영 장비', '짐벌'),
    ('춤', '촬영 장비', '광각 카메라')
)
insert into public.creator_shop_keywords (creator_category, shop_category, keyword, source, is_active)
select creator_category, shop_category, keyword, 'naver', true
from default_keywords
on conflict (creator_category, keyword, source) do update set
  shop_category = excluded.shop_category,
  is_active = true,
  updated_at = now();

alter table public.creator_shop_keywords enable row level security;
alter table public.creator_shop_products enable row level security;
alter table public.creator_shop_collection_logs enable row level security;

drop policy if exists "creator_shop_keywords_select_active" on public.creator_shop_keywords;
drop policy if exists "creator_shop_products_select_public" on public.creator_shop_products;

create policy "creator_shop_keywords_select_active"
on public.creator_shop_keywords for select
using (is_active = true);

create policy "creator_shop_products_select_public"
on public.creator_shop_products for select
using (true);

grant select on public.creator_shop_keywords to anon, authenticated;
grant select on public.creator_shop_products to anon, authenticated;
grant select, insert, update, delete on public.creator_shop_keywords to service_role;
grant select, insert, update, delete on public.creator_shop_products to service_role;
grant select, insert, update on public.creator_shop_collection_logs to service_role;
