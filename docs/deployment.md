# Deployment

## 최종 서비스 구조

```text
Vercel Frontend
→ Render Backend API
→ YouTube API / Supabase / Local LLM API
```

Vercel은 UI만 담당한다. 브라우저에서 실행되는 클라이언트 컴포넌트는 `NEXT_PUBLIC_API_BASE_URL`을 사용해 Render Backend API를 직접 호출한다. YouTube API Key, Supabase Service Role Key, Local LLM API Key 같은 서버 비밀키는 Render Backend에만 둔다.

## Vercel Frontend 환경변수

Vercel에는 브라우저에 노출되어도 되는 값만 설정한다.

```env
NEXT_PUBLIC_SITE_URL=https://be-celeb.org
NEXT_PUBLIC_API_BASE_URL=https://your-render-backend.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Vercel에는 다음 값을 넣지 않는다.

- `YOUTUBE_API_KEY`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `NAVER_SHOPPING_CLIENT_ID` (optional, 쇼핑 검색 전용)
- `NAVER_SHOPPING_CLIENT_SECRET` (optional, 쇼핑 검색 전용)
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOCAL_LLM_API_KEY`
- `CRON_SECRET`
- `ADMIN_SECRET`

이 값들은 브라우저 또는 Vercel UI 서버에서 필요하지 않다. dashboard 추천 요청은 Vercel `/api`가 아니라 `NEXT_PUBLIC_API_BASE_URL`의 Render API로 이동한다.
Admin 콘솔(`/admin`)도 Render Backend의 `/api/admin/*`만 호출한다.

## Render Backend 환경변수

Render Backend API에는 서버에서만 쓰는 값을 설정한다.

```env
NEXT_PUBLIC_SITE_URL=https://be-celeb.org
ALLOWED_ORIGINS=https://be-celeb.org,https://be-celeb.vercel.app,http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
YOUTUBE_API_KEY=your-youtube-api-key
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
NAVER_SHOPPING_CLIENT_ID=your-shopping-search-client-id
NAVER_SHOPPING_CLIENT_SECRET=your-shopping-search-client-secret
LOCAL_LLM_API_URL=https://llm-api.be-celeb.org/v1/chat/completions
LOCAL_LLM_API_KEY=your-local-llm-key
LOCAL_LLM_MODEL=local-model
CRON_SECRET=your-cron-secret
ADMIN_SECRET=your-admin-secret
```

`ADMIN_SECRET`은 MVP admin passcode다. 운영자는 `/admin`에서 이 값을 입력하고, 프론트엔드는 `Authorization: Bearer <ADMIN_SECRET>`로 Render Backend에 전달한다. 장기 운영에서는 Supabase Auth admin role로 교체하는 것을 권장한다.

## API Base URL

Frontend API client는 `apps/web/src/lib/api` 도메인 wrapper와 `apps/web/src/lib/client/api.ts` 공통 fetch client로 구성된다.

- `getApiBaseUrl()`은 `NEXT_PUBLIC_API_BASE_URL`을 읽는다.
- `apiFetch("/api/...")`는 내부에서 Render Backend URL과 결합한다.
- 예: `/api/recommend-content` → `https://your-render-backend.onrender.com/api/recommend-content`
- `NEXT_PUBLIC_API_BASE_URL`이 없으면 `NEXT_PUBLIC_API_BASE_URL is not configured` 에러를 표시한다.
- `NEXT_PUBLIC_API_BASE_URL`에는 `/api`를 붙이지 않는다.

올바른 값:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.be-celeb.org
```

잘못된 값:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.be-celeb.org/api
```

잘못된 값은 `https://api.be-celeb.org/api/api/recommend-content`처럼 중복 path를 만들 수 있다.

## Render Backend API Paths

Render Backend가 `apps/api` FastAPI를 배포할 때도 Vercel Frontend와 호환되는 path를 제공한다.

```text
POST /api/recommend-content
GET  /api/recommendations/{recommendation_id}
POST /api/analyze-channel
GET  /api/user/channel-settings
PUT  /api/user/channel-settings
DELETE /api/account
GET  /api/favorites
POST /api/favorites
PATCH /api/favorites/{favorite_id}
DELETE /api/favorites/{favorite_id}
GET  /api/production-items
POST /api/production-items
PATCH /api/production-items/{id}
DELETE /api/production-items/{id}
GET  /api/calendar/events?start=YYYY-MM-DD&end=YYYY-MM-DD
POST /api/calendar/events
PATCH /api/calendar/events/{event_id}
DELETE /api/calendar/events/{event_id}
GET  /api/growth-report
POST /api/growth-report/refresh
GET  /api/shop/sections
GET  /api/shop/products?equipmentCategory=카메라&limit=8&sort=popular
GET  /api/shop/sets
POST /api/cron/collect-shop-products
GET  /api/admin/llm-prompts
GET  /api/trends/popular-videos
GET  /api/trends/keywords?range=daily|weekly|monthly
GET  /api/trends/naver-keywords?category=IT&range=daily|weekly|monthly
GET  /api/trends/combined?category=IT&range=daily|weekly|monthly
POST /api/cron/collect-naver-trends
GET/POST/PATCH/DELETE /api/admin/naver-keyword-groups
POST /api/admin/collect-naver-trends
GET  /api/admin/naver-collection-logs
```

Dashboard의 기본 추천 플로우는 1회 LLM 호출 API와 결과 조회 API를 사용한다.

1. `POST /api/recommend-content`: 채널 분석, 카테고리 선정, 인플루언서 영상 비교, active prompt 적용, 추천 결과 저장 후 `recommendationId` 반환
2. `GET /api/recommendations/{recommendation_id}`: 새로고침 가능한 결과 페이지에서 제목, 추천 이유, 해시태그, 상세 콘티 조회
3. `GET/PUT /api/user/channel-settings`: 회원별 channel URL/category 저장 및 자동 불러오기
4. `GET/POST/PATCH/DELETE /api/admin/llm-prompts`: admin active LLM prompt 관리

추천 요청은 선택형 옵션을 받는다. `title`은 항상 생성하고, 나머지 필드는 사용자가 체크한 항목만 prompt와 JSON schema에 포함한다.

```json
{
  "channelUrl": "https://www.youtube.com/@example",
  "category": "IT",
  "options": {
    "reason": true,
    "hashtags": true,
    "storyboard": true,
    "hook": false,
    "thumbnailIdea": false,
    "uploadTips": false
  }
}
```

LLM `max_tokens`는 선택 옵션에 따라 동적으로 증가한다. 기본 추천은 1200~1600 수준, 추천이유/해시태그 중심은 약 1800, 콘티 포함 시 3500~5000, 콘티와 hook/thumbnail/uploadTips를 모두 포함하면 5000~7000 범위를 사용한다. `storyboard=true`일 때는 8~12 scene, scene별 `duration`, `visual`, `dialogue`, `caption`, `shootingTip`을 요구한다.

## Favorites / Production Board / Calendar / Growth Report

사용자 생산 워크플로우는 다음 테이블에 저장된다. 기본 migration은 `supabase/migrations/20260519001000_planning_growth_features.sql`이고, 제작 보드/캘린더 연동 확장은 `supabase/migrations/20260522004000_production_calendar_schedule_link.sql`이다.

- `favorites`: 추천 결과 또는 콘텐츠 아이디어 즐겨찾기 목록. `recommendation_id`, `title`, `reason`, `hashtags`, `storyboard`, `source`를 저장한다.
- `production_board_items`: 직접 만든 콘텐츠 또는 즐겨찾기/추천 결과에서 전환한 제작 카드. `title`, `description`, `hashtags`, `storyboard`, `status`, `shoot_start_date`, `shoot_end_date`, `calendar_event_id`를 저장한다.
- `production_items`: `production_board_items`를 노출하는 compatibility view. API는 기존 테이블을 기준으로 동작한다.
- `calendar_events`: 업로드/촬영 일정. `start_date`, `end_date`, `color`, `production_item_id`, `metadata`로 multi-day 일정과 제작 보드 연동을 지원한다.
- `channel_growth_snapshots`: YouTube 채널의 구독자 수, 전체 조회수, 영상 수, 최근 영상 통계를 스냅샷으로 저장한다.
- `video_growth_snapshots`: 최근 영상별 조회수, 좋아요, 댓글 스냅샷을 저장한다. migration은 `supabase/migrations/20260522001000_video_growth_snapshots.sql`이다.

Frontend 라우트:

```text
/favorites
/production-board
/calendar
/growth-report
/growth-report/videos/[videoId]
```

`/favorites`는 추천 결과에서 저장한 즐겨찾기를 카드로 보여주고, 날짜를 선택해 바로 `calendar_events`에 업로드 일정을 만든다. `/production-board`는 직접 콘텐츠를 만들거나 즐겨찾기/추천 결과에서 제작 카드로 전환하며, 제목/설명/해시태그/콘티/메모/촬영일을 관리한다. `/calendar`는 월간 캘린더를 기본으로 제공하며 날짜 클릭으로 일정 추가, 일정 클릭으로 수정/삭제를 지원한다. 일정은 색상과 시작일/종료일을 가질 수 있고, multi-day 일정은 범위 내 각 날짜 칸에 표시된다. `/growth-report`는 저장된 user channel settings를 기준으로 YouTube API에서 현재 채널 지표를 조회하고 스냅샷을 저장한다. 최근 영상 성과를 클릭하면 `/growth-report/videos/[videoId]`로 이동해 영상별 조회수, 좋아요, 댓글 추이 그래프를 확인한다.

Production board와 calendar 연동 정책:

- production item에 `shoot_start_date`가 있으면 backend가 `calendar_events`를 자동 upsert한다.
- 생성된 calendar event는 `metadata.source = "production-board"`와 `metadata.productionItemId`를 가진다.
- production item의 촬영 시작일/종료일을 수정하면 연결된 calendar event의 `start_date`/`end_date`도 갱신된다.
- calendar에서 production-linked event의 날짜를 수정하면 production item의 `shoot_start_date`/`shoot_end_date`도 갱신된다.
- production item에서 촬영일을 제거하면 연결된 calendar event를 삭제하고 `calendar_event_id`를 비운다.

Growth report 그래프:

- snapshot이 2개 이상이면 Recharts line chart로 `subscriber_count`, `view_count`, `video_count` 추이를 표시
- snapshot이 1개 이하이면 “추이 데이터가 더 필요합니다” 안내 표시
- “지금 갱신” 버튼은 `POST /api/growth-report/refresh`로 최신 snapshot을 저장
- 영상 상세 그래프는 `video_growth_snapshots`의 일일 point를 사용한다. point가 1개 이하이면 “추이 데이터가 더 필요합니다” 안내를 표시한다.

성장 리포트 refresh는 YouTube API quota를 사용한다. 운영에서는 refresh 버튼을 과도하게 누르지 않도록 UI/정책을 조정할 수 있다. 매일 자동 갱신은 `POST /api/cron/collect-growth-report`가 `CRON_SECRET` 검증 후 `user_channel_settings`의 모든 회원 채널을 순회해 채널/영상 스냅샷을 저장한다.

회원이 채널 URL을 다른 YouTube 채널로 변경하면 backend는 기존 `channel_growth_snapshots`와 `video_growth_snapshots`를 삭제한다. 성장 리포트는 채널별 시계열 데이터이므로 새 채널 기준으로 그래프를 다시 시작하는 “삭제 후 초기화” 정책을 사용한다. 같은 YouTube 채널을 다른 URL 형태로 저장하는 경우에는 `youtube_channel_id`가 같으므로 기존 스냅샷을 유지한다.

Admin에서 favorites/calendar/growth snapshots 전체 관리 UI는 아직 확장하지 않았다. 운영 필요 시 admin 도메인에서 목록/삭제 API를 추가하면 된다.

## Profile / Password

`/profile`은 추천 사용량과 서비스 이용 상태 UI를 표시하지 않는다. 현재 계정 설정 화면은 다음만 제공한다.

- 닉네임 변경
- YouTube 채널 URL/category 변경
- 비밀번호 변경
- 계정 삭제

비밀번호 변경은 Supabase Auth browser client를 사용한다. 사용자가 입력한 현재 비밀번호로 `signInWithPassword`를 먼저 수행해 검증한 뒤 `updateUser({ password })`로 새 비밀번호를 저장한다. service role key는 프론트에 노출하지 않으며, 변경 후 현재 세션은 유지된다.

비밀번호 유효성:

- 현재 비밀번호, 새 비밀번호, 새 비밀번호 확인 모두 필수
- 새 비밀번호 8자 이상
- 새 비밀번호와 확인 값 일치

비밀번호 재설정 메일 발송도 더 이상 Vercel `/api/auth/reset-password` route를 호출하지 않고 Supabase Auth browser client에서 직접 수행한다. 인증 callback route만 세션 교환을 위해 유지한다.

## Naver Shopping Creator Shop

`/shop`은 검색형 화면이 아니라 “크리에이터 필수 장비 자동 진열형 상점”이다. 페이지 진입 즉시 카메라, 마이크, 조명, 편집툴, 삼각대/거치대, 배경/소품, 저장장치, 라이브/스트리밍 장비 섹션을 불러온다. 프론트에서 Naver API를 직접 호출하지 않고 Render Backend API만 호출한다.

```text
GET https://openapi.naver.com/v1/search/shop.json
```

요청 header:

```text
X-Naver-Client-Id: NAVER_SHOPPING_CLIENT_ID 또는 NAVER_CLIENT_ID
X-Naver-Client-Secret: NAVER_SHOPPING_CLIENT_SECRET 또는 NAVER_CLIENT_SECRET
```

검색어트렌드 DataLab은 `POST /v1/datalab/search`를 사용하지만 `/shop` 상품 카드는 `GET /v1/search/shop.json`을 사용한다. 두 API는 Naver Developers 권한이 다르다. DataLab 검색어트렌드가 정상이어도 “검색 API / 쇼핑 검색” 권한이 없는 키면 `/shop`은 fallback을 표시한다. 운영에서는 쇼핑 검색 권한이 있는 별도 앱 키를 `NAVER_SHOPPING_CLIENT_ID`, `NAVER_SHOPPING_CLIENT_SECRET`으로 넣는 것을 권장한다. 이 값이 없으면 기존 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`으로 fallback한다.

저장 테이블은 migration `supabase/migrations/20260519002000_creator_shop_products.sql`, 장비 섹션 전환 migration `supabase/migrations/20260520001000_shop_equipment_store.sql`, 캐시 상점 확장 migration `supabase/migrations/20260522003000_shop_cache_storefront.sql`에 포함되어 있다.

- `creator_shop_keywords`: 장비 섹션별 active 쇼핑 검색어
- `creator_shop_products`: Naver Shopping 상품 캐시. `source`, `source_product_id`, `equipment_category`, `search_keyword` 기준 upsert. `popularity_score`, `recommended_level`, `collected_at`으로 상점 정렬과 세트 필터를 지원
- `creator_shop_sets`: 입문용/중급자용/고급자용 장비 세트 설명
- `creator_shop_collection_logs`: daily shop 수집 결과와 오류 요약

기본 장비 섹션과 검색어 seed:

```txt
카메라: 브이로그 카메라, 유튜브 카메라, 액션캠
마이크: 유튜브 마이크, 무선 핀마이크, USB 마이크
조명: 링라이트, 유튜브 조명, 촬영 조명
편집툴: 영상 편집 키보드, 편집 모니터, 외장 SSD
삼각대/거치대: 카메라 삼각대, 스마트폰 삼각대, 책상 거치대
배경/소품: 촬영 배경지, 크로마키 배경, 제품 촬영 소품
저장장치: 외장 SSD, SD 카드, CFexpress 카드
라이브/스트리밍 장비: 웹캠, 캡처보드, 스트림덱
```

API 동작:

- `GET /api/shop/sections`: 기본 장비 섹션과 검색어 반환
- `GET /api/shop/products?equipmentCategory=카메라&limit=8&sort=popular`: DB cache만 조회. `equipmentCategory`가 없으면 모든 기본 섹션 반환
- `sort`는 `popular`, `price_asc`, `price_desc`, `latest`를 지원한다. `level=beginner|intermediate|advanced`로 세트 수준 상품만 볼 수 있다.
- `GET /api/shop/sets`: 입문용, 중급자용, 고급자용 장비 세트 반환
- cache가 비어 있거나 DB 조회가 실패하면 Naver API를 즉시 호출하지 않고 기본 curated fallback 장비를 반환
- `POST /api/cron/collect-shop-products`: `CRON_SECRET` 검증 후 active keyword 전체 daily 수집

Shop 페이지는 광고/제휴 링크가 아니라 매일 수집된 쇼핑 cache 기반 장비 목록이다. Naver API 호출은 daily collector 또는 admin 테스트/수집에서만 실행한다. `source` 컬럼은 추후 Coupang Partners 같은 다른 source를 추가할 수 있도록 유지한다.

Naver Shopping 401 `errorCode: 024`는 보통 “Scope Status Invalid / Authentication failed”다. 코드에서는 endpoint와 header를 다음처럼 고정한다.

```text
GET https://openapi.naver.com/v1/search/shop.json
X-Naver-Client-Id: NAVER_SHOPPING_CLIENT_ID 또는 NAVER_CLIENT_ID
X-Naver-Client-Secret: NAVER_SHOPPING_CLIENT_SECRET 또는 NAVER_CLIENT_SECRET
```

401/024 체크리스트:

- `NAVER_SHOPPING_CLIENT_ID`, `NAVER_SHOPPING_CLIENT_SECRET` 또는 fallback용 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 Vercel이 아니라 Render Backend 환경변수에 넣었는지 확인
- Render 환경변수 수정 후 Backend 서비스를 재배포했는지 확인
- Naver Developers 앱에 “검색 API / 쇼핑 검색 API” 권한이 활성화되어 있는지 확인
- DataLab API 권한/키와 Shopping Search API 권한/키를 혼동하지 않았는지 확인
- 코드 로그에는 client id/secret 값이 아니라 존재 여부 boolean, status code, errorCode, query만 남긴다
- Admin `/admin`의 시스템 섹션에서 `Naver Shopping API 테스트`를 실행해 status code, errorCode, credential source를 확인한다.

## Naver DataLab 검색 트렌드

Backend는 Naver DataLab `통합검색어 트렌드 API`를 사용해 한국 검색 관심도를 하루 1회 수집한다.

```text
POST https://openapi.naver.com/v1/datalab/search
```

요청 header:

```text
X-Naver-Client-Id: NAVER_CLIENT_ID
X-Naver-Client-Secret: NAVER_CLIENT_SECRET
Content-Type: application/json
```

수집 기준:

- KST 매일 06:00, UTC 매일 21:00
- `timeUnit=date`
- 최근 30일 기준 `startDate/endDate`
- `naver_trend_keyword_groups`의 active keyword group만 호출
- 일부 category/group batch가 실패해도 나머지 수집은 계속 진행
- 수집 결과와 실패 요약은 `naver_trend_collection_logs`에 저장

저장 테이블:

- `naver_trend_keyword_groups`: category별 keyword group 관리 테이블. Admin에서 CRUD 및 active toggle 가능
- `naver_trend_daily_points`: `group_id + period + time_unit` 기준 upsert되는 daily ratio
- `naver_trend_collection_logs`: Naver 수집 job 상태와 summary/error 기록

`ratio`는 절대 검색량이 아니다. Naver DataLab이 요청 기간과 keyword group 기준으로 제공하는 상대 검색 추이 값이며, 사용자 화면에서는 “검색 관심도” 상대 지표로 표시한다.

기본 keyword group seed는 migration `supabase/migrations/20260517002000_naver_datalab_trends.sql`에 포함되어 있다. 기본 카테고리는 다음 11개다.

```txt
게임, 운동, IT, 노래, OTT, 일상, 뷰티, 스터디, 코미디, 먹방, 춤
```

Trends 페이지는 기존 YouTube 인기 영상/태그 집계를 유지하고, 아래에 검색 관심도와 결합 트렌드를 추가한다. 인플루언서 채널과 영상은 여러 카테고리에 연결될 수 있으며, 신규 조회 로직은 `influencer_channel_categories`, `influencer_video_categories` join table을 우선 사용한다. 기존 `category_id`는 호환 fallback으로 유지한다.

급상승 키워드는 전체 count 상위 태그만 뽑지 않고 카테고리별 Top 3~5개를 먼저 계산한 뒤 균형 있게 섞는다. 검색 관심도 데이터가 있으면 카테고리별 키워드 boost로 낮은 가중치만 더한다.

결합 점수는 keyword 단위로 다음 값을 정규화해 계산한다.

```text
combinedScore = normalizedYoutubeTagCount * 0.4
  + normalizedYoutubeViews * 0.3
  + normalizedNaverRatio * 0.3
```

`/api/trends/popular-videos`는 `influencer_video_categories`와 `influencer_videos` 데이터를 조회해 카테고리별 조회수 1등 영상을 반환한다. 운영 중 빈 DB, category join 누락, nullable `view_count`, 누락된 thumbnail/published_at 때문에 500이 나면 안 된다. 현재 구현은 Supabase 쿼리 실패를 서버 로그에 남기고 빈 배열을 반환하며, row별 매핑은 다음 fallback을 사용한다.

- 배포 DB와 코드의 컬럼명이 다를 수 있어 `youtube_video_id`, `video_id`, `thumbnail_url`, `thumbnails`, `category_name`, `category` 조합으로 select를 재시도
- endpoint 컨트롤러까지 예외가 올라와도 화면이 깨지지 않도록 `{ "videos": [] }` fallback 반환
- category join 실패: `category_name`, `category`, `"기타"` 순서로 fallback
- 다중 카테고리 join table 누락: legacy `influencer_videos.category_id` fallback
- `view_count`, `like_count`, `comment_count` null: `0`
- thumbnail json 누락: `thumbnailUrl: null`
- `published_at` 누락: `publishedAt: null`

확인:

```bash
curl "$NEXT_PUBLIC_API_BASE_URL/api/trends/popular-videos"
```

응답은 DB가 비어 있어도 500이 아니라 다음 형태의 빈 배열이어야 한다.

```json
{ "success": true, "data": { "videos": [] } }
```

기존 health/main route도 유지된다.

```text
GET  /health
GET  /trends
GET  /api/v1/main
```

로컬 개발 예시:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

프론트와 백엔드를 분리해서 띄울 때:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## CORS 설정

Render Backend API는 FastAPI `app.core.cors.configure_cors`에서 CORS 헤더를 설정한다.

필수 설정:

```env
ALLOWED_ORIGINS=https://be-celeb.org,https://be-celeb.vercel.app,http://localhost:3000
```

처리 내용:

- `OPTIONS` preflight 요청 처리
- `Access-Control-Allow-Origin`은 `ALLOWED_ORIGINS`에 포함된 origin만 허용
- `Access-Control-Allow-Methods: GET,POST,PATCH,PUT,DELETE,OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, x-cron-secret`
- `Access-Control-Allow-Credentials: true`

보안상 `*` origin은 사용하지 않는다.

## Frontend API 원칙

비즈니스 API용 `apps/web/src/app/api/*` route handler는 제거했다. Vercel Frontend는 UI만 담당하고 Render Backend API만 호출한다. Supabase Auth callback처럼 브라우저 세션 교환에 필요한 auth route handler만 유지한다.

Frontend 원칙:

```ts
import { recommendContent } from "@/lib/api/recommendations";

await recommendContent(payload);
```

금지:

```ts
await fetch("/api/recommend-content");
```

## 배포 후 확인 방법

1. Vercel에서 `NEXT_PUBLIC_API_BASE_URL`이 Render Backend URL인지 확인한다.
2. 브라우저 개발자 도구 Network 탭을 연다.
3. `/dashboard`에서 추천 생성을 실행한다.
4. 요청 URL이 `https://your-render-backend.onrender.com/api/recommend-content`인지 확인한다.
5. 요청 URL이 `https://be-celeb.org/api/recommend-content`이면 잘못된 배포다.
6. 요청 URL이 `https://api.be-celeb.org/api/api/recommend-content`이면 `NEXT_PUBLIC_API_BASE_URL`에서 `/api`를 제거한다.
7. CORS 오류가 나면 Render의 `ALLOWED_ORIGINS`에 현재 Vercel origin을 추가하고 재배포한다.
8. `Backend API request failed: 404`가 나면 Render Backend에 위 compatibility route가 배포됐는지 확인한다.
9. `Missing required environment variable: YOUTUBE_API_KEY`가 나면 route는 정상 진입한 것이므로 Render Backend 서비스의 환경변수와 재배포 여부를 확인한다.

추천 생성 curl 확인:

```bash
curl -X POST "$NEXT_PUBLIC_API_BASE_URL/api/recommend-content" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -d '{"channelUrl":"https://www.youtube.com/@example","category":"IT","options":{"reason":true,"hashtags":true,"storyboard":true,"hook":false,"thumbnailIdea":false,"uploadTips":false}}'
```

회원별 채널 설정 확인:

```bash
curl "$NEXT_PUBLIC_API_BASE_URL/api/user/channel-settings" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

즐겨찾기/캘린더/성장 리포트 확인:

```bash
curl "$NEXT_PUBLIC_API_BASE_URL/api/favorites" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$NEXT_PUBLIC_API_BASE_URL/api/calendar/events?start=2026-05-01&end=2026-05-31" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$NEXT_PUBLIC_API_BASE_URL/api/production-items" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl -X POST "$NEXT_PUBLIC_API_BASE_URL/api/production-items" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"촬영할 콘텐츠 아이디어","hashtags":["#촬영"],"storyboard":[{"scene":1,"description":"오프닝"}],"shootStartDate":"2026-05-10","shootEndDate":"2026-05-12"}'

curl "$NEXT_PUBLIC_API_BASE_URL/api/growth-report" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl -X POST "$NEXT_PUBLIC_API_BASE_URL/api/growth-report/refresh" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

Shop 확인:

```bash
curl "$NEXT_PUBLIC_API_BASE_URL/api/shop/sections"

curl "$NEXT_PUBLIC_API_BASE_URL/api/shop/products?limit=8"

curl "$NEXT_PUBLIC_API_BASE_URL/api/shop/products?equipmentCategory=%EC%B9%B4%EB%A9%94%EB%9D%BC&limit=8&sort=price_asc"

curl "$NEXT_PUBLIC_API_BASE_URL/api/shop/sets"
```

404가 아니고 섹션별 상품, cache, fallback 중 하나가 나오면 path 연결은 정상이다. Naver 인증 오류가 있어도 `/shop` 상품 조회 API는 외부 API를 즉시 호출하지 않으며, 화면은 cache 또는 기본 추천 장비를 표시해야 한다. 실제 401 `errorCode: 024`, query, env 존재 여부는 collector/admin test backend logger에만 남긴다.

## Cron

Daily YouTube collection과 Daily Naver trends collection은 Render Backend API를 호출한다.

```env
DAILY_COLLECT_ENDPOINT=https://your-render-backend.onrender.com/api/cron/collect-daily-videos
DAILY_NAVER_TRENDS_ENDPOINT=https://api.be-celeb.org/api/cron/collect-naver-trends
DAILY_SHOP_PRODUCTS_ENDPOINT=https://api.be-celeb.org/api/cron/collect-shop-products
DAILY_GROWTH_REPORT_ENDPOINT=https://api.be-celeb.org/api/cron/collect-growth-report
CRON_SECRET=your-cron-secret
```

Schedule:

```text
0 21 * * *
```

UTC 21:00은 KST 매일 06:00이다.

GitHub Actions repository secrets:

```txt
DAILY_COLLECT_ENDPOINT=https://api.be-celeb.org/api/cron/collect-daily-videos
DAILY_NAVER_TRENDS_ENDPOINT=https://api.be-celeb.org/api/cron/collect-naver-trends
DAILY_SHOP_PRODUCTS_ENDPOINT=https://api.be-celeb.org/api/cron/collect-shop-products
DAILY_GROWTH_REPORT_ENDPOINT=https://api.be-celeb.org/api/cron/collect-growth-report
CRON_SECRET=your-cron-secret
```

`curl: (3) URL rejected: Malformed input to a URL function`가 발생하면 backend API가 실행되기 전 단계에서 URL secret 값 자체가 잘못된 것이다. GitHub repository secret의 `DAILY_SHOP_PRODUCTS_ENDPOINT`를 다시 저장한다.

- 값은 한 줄짜리 절대 URL이어야 한다.
- 따옴표, 백슬래시(`\`), trailing slash 뒤의 공백, 줄바꿈을 넣지 않는다.
- 예: `https://api.be-celeb.org/api/cron/collect-shop-products`
- Vercel frontend URL이 아니라 Render Backend API URL을 넣는다.

`curl: (28) Operation timed out after 60002 milliseconds with 0 bytes received`는 URL validation 이후 backend collector가 60초 안에 응답을 시작하지 못했다는 뜻이다. Daily YouTube collector는 active influencer channel별로 YouTube API와 Supabase upsert를 수행하므로 60초를 넘을 수 있다. GitHub Actions는 YouTube collector를 최대 600초까지 기다리며, backend는 최대 4개 채널씩 제한 병렬 처리한다. POST 수집 endpoint는 timeout 재시도 시 중복 실행될 수 있으므로 retry 옵션을 사용하지 않는다.

수동 Naver 수집 확인:

```bash
curl --fail-with-body -X POST "$NEXT_PUBLIC_API_BASE_URL/api/cron/collect-naver-trends" \
  -H "Authorization: Bearer $CRON_SECRET"
```

저장 확인:

```sql
select category_name, keyword_group_title, period, ratio
from public.naver_trend_daily_points
order by period desc
limit 20;
```

수동 Shop 상품 수집 확인:

```bash
curl --fail-with-body -X POST "$NEXT_PUBLIC_API_BASE_URL/api/cron/collect-shop-products" \
  -H "Authorization: Bearer $CRON_SECRET"
```

저장 확인:

```sql
select equipment_category, search_keyword, title, price, mall_name
from public.creator_shop_products
order by collected_at desc
limit 20;
```

수동 Growth report 수집 확인:

```bash
curl --fail-with-body -X POST "$NEXT_PUBLIC_API_BASE_URL/api/cron/collect-growth-report" \
  -H "Authorization: Bearer $CRON_SECRET"
```

저장 확인:

```sql
select user_id, youtube_channel_id, subscriber_count, view_count, video_count, collected_at
from public.channel_growth_snapshots
order by collected_at desc
limit 20;

select user_id, youtube_video_id, view_count, like_count, comment_count, collected_at
from public.video_growth_snapshots
order by collected_at desc
limit 20;
```

## 정리된 코드

- `/profile`에서 추천 사용량과 서비스 이용 상태 UI 조회를 제거했다.
- 사용되지 않던 `apps/web/src/lib/config/dev-auth-store.ts`, `apps/web/src/lib/config/auth-provider.ts`, `apps/web/src/components/common/ProductCard.tsx`를 삭제했다.
- `/shop`의 mock 상품 목록과 Naver Shopping 직접 링크 생성 로직을 제거하고 Render Backend API 호출로 교체했다.
- 클라이언트의 `fetch("/api/...")` 잔여 호출을 제거했다. 비밀번호 재설정 메일은 Supabase Auth browser client를 사용한다.
