-- Convert creator shop cache from creator-category search to equipment-section display.

alter table public.creator_shop_keywords
  add column if not exists equipment_category text;

alter table public.creator_shop_keywords
  alter column creator_category drop not null;

update public.creator_shop_keywords
set equipment_category = coalesce(equipment_category, shop_category, creator_category, '기타')
where equipment_category is null;

alter table public.creator_shop_keywords
  alter column equipment_category set not null;

delete from public.creator_shop_keywords a
using public.creator_shop_keywords b
where a.ctid < b.ctid
  and a.source = b.source
  and a.equipment_category = b.equipment_category
  and a.keyword = b.keyword;

create unique index if not exists creator_shop_keywords_equipment_keyword_source_unique_idx
on public.creator_shop_keywords(equipment_category, keyword, source);

create index if not exists idx_creator_shop_keywords_equipment_active
on public.creator_shop_keywords(equipment_category, is_active);

alter table public.creator_shop_products
  add column if not exists equipment_category text;

alter table public.creator_shop_products
  alter column creator_category drop not null,
  alter column product_url drop not null;

update public.creator_shop_products
set equipment_category = coalesce(equipment_category, category, creator_category, '기타')
where equipment_category is null;

alter table public.creator_shop_products
  alter column equipment_category set not null;

delete from public.creator_shop_products a
using public.creator_shop_products b
where a.ctid < b.ctid
  and a.source = b.source
  and coalesce(a.source_product_id, '') = coalesce(b.source_product_id, '')
  and a.equipment_category = b.equipment_category
  and a.search_keyword = b.search_keyword;

create unique index if not exists creator_shop_products_equipment_product_keyword_unique_idx
on public.creator_shop_products(source, source_product_id, equipment_category, search_keyword);

create index if not exists idx_creator_shop_products_equipment_keyword
on public.creator_shop_products(equipment_category, search_keyword);

with default_keywords(equipment_category, keyword) as (
  values
    ('카메라', '브이로그 카메라'),
    ('카메라', '유튜브 카메라'),
    ('카메라', '액션캠'),
    ('마이크', '유튜브 마이크'),
    ('마이크', '무선 핀마이크'),
    ('마이크', 'USB 마이크'),
    ('조명', '링라이트'),
    ('조명', '유튜브 조명'),
    ('조명', '촬영 조명'),
    ('편집툴', '영상 편집 키보드'),
    ('편집툴', '편집 모니터'),
    ('편집툴', '외장 SSD'),
    ('삼각대/거치대', '카메라 삼각대'),
    ('삼각대/거치대', '스마트폰 삼각대'),
    ('삼각대/거치대', '책상 거치대'),
    ('배경/소품', '촬영 배경지'),
    ('배경/소품', '크로마키 배경'),
    ('배경/소품', '제품 촬영 소품'),
    ('저장장치', '외장 SSD'),
    ('저장장치', 'SD 카드'),
    ('저장장치', 'CFexpress 카드'),
    ('라이브/스트리밍 장비', '웹캠'),
    ('라이브/스트리밍 장비', '캡처보드'),
    ('라이브/스트리밍 장비', '스트림덱')
)
insert into public.creator_shop_keywords (equipment_category, shop_category, keyword, source, is_active)
select equipment_category, equipment_category, keyword, 'naver', true
from default_keywords
on conflict (equipment_category, keyword, source) do update set
  shop_category = excluded.shop_category,
  is_active = true,
  updated_at = now();
