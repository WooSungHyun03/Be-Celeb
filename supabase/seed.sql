-- Be Celeb seed data
-- Auth user seed is intentionally excluded.
-- Seed data uses unique keys + upsert to avoid duplicates when re-run.

insert into public.trends (
  title, type, category, summary, score, keywords, hashtags, thumbnail_url, is_active
) values
(
  'GRWM 숏폼',
  'content',
  'beauty',
  '준비 과정을 빠르게 보여주는 릴스 트렌드',
  92,
  array['GRWM', '데일리', '메이크업'],
  array['#GRWM', '#데일리룩'],
  null,
  true
),
(
  '카페 브이로그',
  'content',
  'lifestyle',
  '감성 카페 방문과 메뉴 리뷰 중심 콘텐츠',
  85,
  array['카페', '브이로그', '감성'],
  array['#카페추천', '#브이로그'],
  null,
  true
),
(
  '운동 루틴 공유',
  'content',
  'fitness',
  '짧은 루틴과 변화 과정을 보여주는 콘텐츠',
  81,
  array['운동', '루틴', '챌린지'],
  array['#운동루틴', '#헬스'],
  null,
  true
),
(
  '가성비 패션템',
  'product',
  'fashion',
  '저렴하지만 활용도 높은 패션 아이템 소개',
  88,
  array['패션', '가성비', '코디'],
  array['#패션템', '#코디추천'],
  null,
  true
),
(
  '자취 꿀템',
  'product',
  'living',
  '자취생에게 유용한 생활용품 소개',
  79,
  array['자취', '생활용품', '꿀템'],
  array['#자취템', '#생활꿀템'],
  null,
  true
)
on conflict (title) do update set
  type = excluded.type,
  category = excluded.category,
  summary = excluded.summary,
  score = excluded.score,
  keywords = excluded.keywords,
  hashtags = excluded.hashtags,
  thumbnail_url = excluded.thumbnail_url,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.products (
  name, category, price, image_url, purchase_url, description, is_active
) values
(
  '미니 LED 조명',
  'living',
  12900,
  null,
  null,
  '숏폼 촬영용 감성 조명',
  true
),
(
  '데일리 크로스백',
  'fashion',
  24900,
  null,
  null,
  '코디 콘텐츠에 활용하기 좋은 가방',
  true
),
(
  '무선 삼각대',
  'camera',
  18900,
  null,
  null,
  '릴스와 쇼츠 촬영용 기본 장비',
  true
),
(
  '틴트 립밤',
  'beauty',
  9900,
  null,
  null,
  'GRWM 콘텐츠에 적합한 뷰티 아이템',
  true
),
(
  '데스크 정리함',
  'living',
  15900,
  null,
  null,
  '방꾸미기/자취 콘텐츠용 소품',
  true
)
on conflict (name) do update set
  category = excluded.category,
  price = excluded.price,
  image_url = excluded.image_url,
  purchase_url = excluded.purchase_url,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.service_contents (
  section, title, description, sort_order, is_active
) values
(
  'hero',
  '트렌드를 콘텐츠로 바꾸는 가장 빠른 방법',
  'Be Celeb은 숏폼 트렌드, 상품, 콘텐츠 전략을 한 번에 추천합니다.',
  1,
  true
),
(
  'trend_analysis',
  '지금 뜨는 키워드를 분석합니다',
  '카테고리별 트렌드와 해시태그를 기반으로 콘텐츠 방향을 제안합니다.',
  2,
  true
),
(
  'product_recommendation',
  '콘텐츠에 어울리는 상품을 추천합니다',
  '촬영 소품과 카테고리별 추천 아이템을 함께 제공합니다.',
  3,
  true
),
(
  'creator_growth',
  '크리에이터 성장 전략을 제공합니다',
  '계정 성향에 맞는 업로드 주제와 훅 문장을 제안합니다.',
  4,
  true
)
on conflict (section) do update set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.sample_recommendations (
  title, category, hook, hashtags, summary, sort_order, is_active
) values
(
  '출근 전 5분 GRWM',
  'beauty',
  '출근 전 5분이면 충분한 데일리 메이크업',
  array['#GRWM', '#데일리메이크업', '#직장인룩'],
  '짧은 준비 과정과 완성 컷을 연결해 저장률을 높이는 콘텐츠입니다.',
  1,
  true
),
(
  '만원대 자취방 분위기 바꾸기',
  'living',
  '이 조명 하나로 방 분위기가 달라집니다',
  array['#자취템', '#방꾸미기', '#가성비템'],
  '저렴한 상품을 활용해 Before/After 구성이 가능한 추천 샘플입니다.',
  2,
  true
),
(
  '운동 초보 3분 루틴',
  'fitness',
  '처음 운동하는 사람도 따라 할 수 있는 3분 루틴',
  array['#운동루틴', '#홈트', '#운동초보'],
  '진입장벽이 낮은 루틴형 콘텐츠로 반복 시청을 유도합니다.',
  3,
  true
),
(
  '데일리백 3가지 코디',
  'fashion',
  '가방 하나로 완성하는 3가지 데일리룩',
  array['#코디추천', '#데일리룩', '#패션템'],
  '하나의 상품을 여러 스타일로 보여주는 상품 연계형 콘텐츠입니다.',
  4,
  true
)
on conflict (title) do update set
  category = excluded.category,
  hook = excluded.hook,
  hashtags = excluded.hashtags,
  summary = excluded.summary,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.strategy_articles (
  slug, title, category, summary, thumbnail_url, content, is_active
) values
(
  'short-form-hook-strategy',
  '숏폼 첫 3초 훅 만드는 법',
  'content_strategy',
  '초반 이탈을 줄이기 위한 질문형/비교형 훅 작성법입니다.',
  null,
  '첫 3초에는 결과를 먼저 보여주거나 사용자의 문제를 직접 언급하는 방식이 효과적입니다.',
  true
),
(
  'trend-keyword-selection',
  '트렌드 키워드 고르는 기준',
  'trend',
  '조회수보다 계정 카테고리와의 적합도를 우선하는 전략입니다.',
  null,
  '모든 트렌드를 따라가기보다 자신의 카테고리와 연결 가능한 키워드를 선택해야 합니다.',
  true
),
(
  'product-content-structure',
  '상품 추천 콘텐츠 구성법',
  'commerce',
  '상품 소개를 광고처럼 보이지 않게 구성하는 방법입니다.',
  null,
  '문제 제기, 사용 장면, 결과 비교 순서로 구성하면 자연스럽게 상품 가치를 전달할 수 있습니다.',
  true
)
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  summary = excluded.summary,
  thumbnail_url = excluded.thumbnail_url,
  content = excluded.content,
  is_active = excluded.is_active,
  updated_at = now();
