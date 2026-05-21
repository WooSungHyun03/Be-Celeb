-- Add audio interface as a creator shop equipment section.

with default_keywords(equipment_category, keyword) as (
  values
    ('오디오 인터페이스', '오디오 인터페이스'),
    ('오디오 인터페이스', '유튜브 오디오 인터페이스'),
    ('오디오 인터페이스', '방송 오디오 인터페이스')
)
insert into public.creator_shop_keywords (equipment_category, shop_category, keyword, source, is_active)
select equipment_category, equipment_category, keyword, 'naver', true
from default_keywords
on conflict (equipment_category, keyword, source) do update set
  shop_category = excluded.shop_category,
  is_active = true,
  updated_at = now();
