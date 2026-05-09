-- Be Celeb seed
-- Auth user seed is intentionally excluded.

insert into public.trends (
  title,
  type,
  category,
  summary,
  keywords,
  hashtags,
  thumbnail_url
) values
(
  'GRWM 숏폼',
  'content',
  'beauty',
  '준비 과정을 빠르게 보여주는 릴스 트렌드',
  array['GRWM', '데일리', '메이크업'],
  array['#GRWM', '#데일리룩'],
  null
),
(
  '카페 브이로그',
  'content',
  'lifestyle',
  '감성 카페 방문과 메뉴 리뷰 중심 콘텐츠',
  array['카페', '브이로그', '감성'],
  array['#카페추천', '#브이로그'],
  null
),
(
  '운동 루틴 공유',
  'content',
  'fitness',
  '짧은 루틴과 변화 과정을 보여주는 콘텐츠',
  array['운동', '루틴', '챌린지'],
  array['#운동루틴', '#헬스'],
  null
),
(
  '가성비 패션템',
  'product',
  'fashion',
  '저렴하지만 활용도 높은 패션 아이템 소개',
  array['패션', '가성비', '코디'],
  array['#패션템', '#코디추천'],
  null
),
(
  '자취 꿀템',
  'product',
  'living',
  '자취생에게 유용한 생활용품 소개',
  array['자취', '생활용품', '꿀템'],
  array['#자취템', '#생활꿀템'],
  null
);

insert into public.products (
  name,
  category,
  price,
  image_url,
  purchase_url,
  description
) values
(
  '미니 LED 조명',
  'living',
  12900,
  null,
  null,
  '숏폼 촬영용 감성 조명'
),
(
  '데일리 크로스백',
  'fashion',
  24900,
  null,
  null,
  '코디 콘텐츠에 활용하기 좋은 가방'
),
(
  '무선 삼각대',
  'camera',
  18900,
  null,
  null,
  '릴스와 쇼츠 촬영용 기본 장비'
),
(
  '틴트 립밤',
  'beauty',
  9900,
  null,
  null,
  'GRWM 콘텐츠에 적합한 뷰티 아이템'
),
(
  '데스크 정리함',
  'living',
  15900,
  null,
  null,
  '방꾸미기/자취 콘텐츠용 소품'
);