-- Cache-backed creator equipment storefront.

alter table public.creator_shop_products
  add column if not exists equipment_category text,
  add column if not exists popularity_score numeric not null default 0,
  add column if not exists recommended_level text,
  add column if not exists collected_at timestamptz default now();

update public.creator_shop_products
set equipment_category = coalesce(equipment_category, category, creator_category, '기타')
where equipment_category is null;

alter table public.creator_shop_products
  alter column popularity_score set default 0,
  alter column collected_at set default now();

create index if not exists idx_creator_shop_products_equipment_popularity
on public.creator_shop_products(equipment_category, popularity_score desc, collected_at desc);

create index if not exists idx_creator_shop_products_equipment_collected
on public.creator_shop_products(equipment_category, collected_at desc);

create index if not exists idx_creator_shop_products_recommended_level
on public.creator_shop_products(recommended_level);

update public.creator_shop_keywords
set is_active = false,
    updated_at = now()
where equipment_category = '오디오 인터페이스';

with recommended_keywords(equipment_category, keyword, recommended_level) as (
  values
    ('마이크', '기본 마이크', 'beginner'),
    ('조명', '링라이트', 'beginner'),
    ('삼각대/거치대', '스마트폰 삼각대', 'beginner'),
    ('마이크', 'USB 마이크', 'beginner'),
    ('마이크', '무선 핀마이크', 'intermediate'),
    ('조명', '촬영 조명', 'intermediate'),
    ('삼각대/거치대', '카메라 삼각대', 'intermediate'),
    ('편집툴', '외장 SSD', 'intermediate'),
    ('카메라', '액션캠', 'advanced'),
    ('라이브/스트리밍 장비', '캡처보드', 'advanced'),
    ('라이브/스트리밍 장비', '스트림덱', 'advanced'),
    ('조명', '고성능 조명', 'advanced')
)
update public.creator_shop_products p
set recommended_level = rk.recommended_level
from recommended_keywords rk
where p.equipment_category = rk.equipment_category
  and p.search_keyword = rk.keyword
  and p.recommended_level is null;

create table if not exists public.creator_shop_sets (
  id uuid primary key default gen_random_uuid(),
  level text not null unique,
  title text not null,
  description text,
  product_ids jsonb,
  created_at timestamptz not null default now()
);

alter table public.creator_shop_sets enable row level security;

drop policy if exists "creator_shop_sets_select_public" on public.creator_shop_sets;

create policy "creator_shop_sets_select_public"
on public.creator_shop_sets for select
using (true);

grant select on public.creator_shop_sets to anon, authenticated;
grant select, insert, update, delete on public.creator_shop_sets to service_role;

insert into public.creator_shop_sets (level, title, description, product_ids)
values
  ('beginner', '입문용 세트', '스마트폰이나 기본 카메라로 바로 촬영을 시작할 때 필요한 기본 구성입니다.', null),
  ('intermediate', '중급자용 세트', '음성 품질과 촬영 안정성을 함께 올리고 편집 파일을 안정적으로 관리하는 구성입니다.', null),
  ('advanced', '고급자용 세트', '라이브, 리뷰, 스튜디오 촬영까지 확장할 수 있는 고급 제작 장비 구성입니다.', null)
on conflict (level) do update set
  title = excluded.title,
  description = excluded.description;
