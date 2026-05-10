-- Be Celeb seed data
-- Auth user seed is intentionally excluded.
-- Seed data uses unique keys + upsert to avoid duplicates when re-run.


-- =========================================================
-- 1. Trends Seed Data
-- 인기 트렌드 / 메인 트렌드 영역
-- =========================================================
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

-- =========================================================
-- 2. Products Seed Data
-- 추천 상품 / 쇼핑 연동용 mock 데이터
-- =========================================================
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


-- =========================================================
-- 3. Service Contents Seed Data
-- 메인페이지 소개 섹션
-- =========================================================
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


-- =========================================================
-- 4. Sample Recommendations Seed Data
-- 추천 결과 예시 mock 데이터
-- =========================================================
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


-- =========================================================
-- 5. Strategy Articles Seed Data
-- 공략글 / 콘텐츠 전략 게시글
-- =========================================================
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


-- =========================================================
-- 6. Influencers Seed Data
-- mock 인플루언서 데이터
-- =========================================================
insert into public.influencers (
  username,
  category,
  keywords,
  hashtags,
  follower_count
) values
(
  'daily_mood.creator',
  'lifestyle',
  array['일상', '감성', '브이로그'],
  array['#일상', '#브이로그', '#감성릴스'],
  125000
),
(
  'fit.shortform',
  'fitness',
  array['운동', '루틴', '챌린지'],
  array['#운동루틴', '#헬스', '#챌린지'],
  98000
),
(
  'beauty.grwm',
  'beauty',
  array['GRWM', '메이크업', '뷰티'],
  array['#GRWM', '#메이크업', '#뷰티팁'],
  210000
),
(
  'minimal.look',
  'fashion',
  array['패션', '코디', '미니멀'],
  array['#데일리룩', '#코디추천', '#미니멀룩'],
  173000
),
(
  'home.cafe.life',
  'living',
  array['자취', '홈카페', '생활템'],
  array['#홈카페', '#자취템', '#생활꿀템'],
  86000
)
on conflict (username) do update set
  category = excluded.category,
  keywords = excluded.keywords,
  hashtags = excluded.hashtags,
  follower_count = excluded.follower_count;


-- =========================================================
-- 7. Reels Seed Data
-- mock 릴스 분석 데이터
-- =========================================================
insert into public.reels (
  influencer_id,
  title,
  topic,
  format,
  hook,
  hashtags,
  views,
  likes,
  comments,
  saves
)
select
  i.id,
  r.title,
  r.topic,
  r.format,
  r.hook,
  r.hashtags,
  r.views,
  r.likes,
  r.comments,
  r.saves
from (
  values
  ('daily_mood.creator', '퇴근 후 감성 루틴', 'evening routine', 'vlog', '퇴근 후 30분만에 분위기 바꾸는 법', array['#퇴근루틴', '#브이로그'], 320000, 18400, 290, 4200),
  ('daily_mood.creator', '주말 카페 기록', 'cafe vlog', 'vlog', '요즘 저장 많은 카페 감성 컷', array['#카페추천', '#감성카페'], 210000, 12400, 180, 3100),
  ('fit.shortform', '하루 10분 복근 루틴', 'workout routine', 'tutorial', '매일 10분만 따라하면 되는 루틴', array['#복근운동', '#홈트'], 540000, 32800, 760, 8900),
  ('fit.shortform', '운동 전 스트레칭', 'stretching', 'tutorial', '운동 전 부상 줄이는 5가지 동작', array['#스트레칭', '#운동팁'], 260000, 14300, 210, 3900),
  ('beauty.grwm', '5분 데일리 메이크업', 'daily makeup', 'grwm', '늦잠 잔 날에도 가능한 5분 메이크업', array['#GRWM', '#데일리메이크업'], 710000, 58200, 980, 12400),
  ('beauty.grwm', '요즘 쓰는 립 조합', 'beauty item', 'review', '댓글에서 제일 많이 물어본 립 조합', array['#립추천', '#뷰티템'], 430000, 27100, 640, 7500),
  ('minimal.look', '검정 슬랙스 코디 3가지', 'fashion styling', 'lookbook', '하나로 돌려입는 출근룩 3가지', array['#출근룩', '#슬랙스코디'], 390000, 21800, 350, 6200),
  ('minimal.look', '봄 미니멀룩 추천', 'season fashion', 'lookbook', '깔끔하게 입고 싶을 때 이 조합', array['#미니멀룩', '#봄코디'], 280000, 16900, 260, 4700),
  ('home.cafe.life', '자취방 홈카페 세팅', 'home cafe', 'before_after', '만원대로 홈카페 분위기 만드는 법', array['#홈카페', '#자취방꾸미기'], 350000, 20300, 410, 6800),
  ('home.cafe.life', '책상 정리 꿀템', 'living item', 'review', '작은 방 책상 정리할 때 꼭 필요한 것', array['#생활꿀템', '#자취템'], 190000, 9800, 150, 2900)
) as r(username, title, topic, format, hook, hashtags, views, likes, comments, saves)
join public.influencers i on i.username = r.username
on conflict (influencer_id, title) do update set
  topic = excluded.topic,
  format = excluded.format,
  hook = excluded.hook,
  hashtags = excluded.hashtags,
  views = excluded.views,
  likes = excluded.likes,
  comments = excluded.comments,
  saves = excluded.saves;