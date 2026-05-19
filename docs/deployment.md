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
GET  /api/calendar/events?start=YYYY-MM-DD&end=YYYY-MM-DD
POST /api/calendar/events
PATCH /api/calendar/events/{event_id}
DELETE /api/calendar/events/{event_id}
GET  /api/growth-report
POST /api/growth-report/refresh
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

## Favorites / Calendar / Growth Report

사용자 생산 워크플로우는 다음 테이블에 저장된다. migration은 `supabase/migrations/20260519001000_planning_growth_features.sql`이다.

- `favorites`: 추천 결과 또는 콘텐츠 아이디어 찜 목록. `recommendation_id`, `title`, `reason`, `hashtags`, `storyboard`, `source`를 저장한다.
- `calendar_events`: 업로드 예정일과 제작 상태. `planned`, `scripted`, `filmed`, `edited`, `uploaded` 상태를 사용한다.
- `channel_growth_snapshots`: YouTube 채널의 구독자 수, 전체 조회수, 영상 수, 최근 영상 통계를 스냅샷으로 저장한다.

Frontend 라우트:

```text
/favorites
/calendar
/growth-report
```

`/favorites`는 추천 결과에서 누른 찜을 카드로 보여주고, 날짜를 선택해 바로 `calendar_events`에 업로드 일정을 만든다. `/calendar`는 월간 캘린더를 기본으로 제공하며 날짜 클릭으로 일정 추가, 일정 클릭으로 수정/삭제를 지원한다. `/growth-report`는 저장된 user channel settings를 기준으로 YouTube API에서 현재 채널 지표를 조회하고 스냅샷을 저장한다.

성장 리포트 refresh는 YouTube API quota를 사용한다. 운영에서는 refresh 버튼을 과도하게 누르지 않도록 UI/정책을 조정할 수 있다.

Admin에서 favorites/calendar/growth snapshots 전체 관리 UI는 아직 확장하지 않았다. 운영 필요 시 admin 도메인에서 목록/삭제 API를 추가하면 된다.

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

`ratio`는 절대 검색량이 아니다. Naver DataLab이 요청 기간과 keyword group 기준으로 제공하는 상대 검색 추이 값이며, trends 화면에서도 상대 지표로만 표시한다.

기본 keyword group seed는 migration `supabase/migrations/20260517002000_naver_datalab_trends.sql`에 포함되어 있다. 기본 카테고리는 다음 11개다.

```txt
게임, 운동, IT, 노래, OTT, 일상, 뷰티, 스터디, 코미디, 먹방, 춤
```

Trends 페이지는 기존 YouTube 인기 영상/태그 집계를 유지하고, 아래에 Naver 검색 트렌드와 결합 트렌드를 추가한다. 결합 점수는 keyword 단위로 다음 값을 정규화해 계산한다.

```text
combinedScore = normalizedYoutubeTagCount * 0.4
  + normalizedYoutubeViews * 0.3
  + normalizedNaverRatio * 0.3
```

`/api/trends/popular-videos`는 `influencer_videos` 데이터를 조회한다. 운영 중 빈 DB, category join 누락, nullable `view_count`, 누락된 thumbnail/published_at 때문에 500이 나면 안 된다. 현재 구현은 Supabase 쿼리 실패를 서버 로그에 남기고 빈 배열을 반환하며, row별 매핑은 다음 fallback을 사용한다.

- category join 실패: `category_name`, `category`, `"미분류"` 순서로 fallback
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

`apps/web/src/app/api/*` route handler는 제거했다. Vercel Frontend는 UI만 담당하고 Render Backend API만 호출한다.

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

찜/캘린더/성장 리포트 확인:

```bash
curl "$NEXT_PUBLIC_API_BASE_URL/api/favorites" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$NEXT_PUBLIC_API_BASE_URL/api/calendar/events?start=2026-05-01&end=2026-05-31" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$NEXT_PUBLIC_API_BASE_URL/api/growth-report" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl -X POST "$NEXT_PUBLIC_API_BASE_URL/api/growth-report/refresh" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

404가 아니고 추천 결과 또는 명확한 환경변수 오류가 나오면 path 연결은 정상이다.

## Cron

Daily YouTube collection과 Daily Naver trends collection은 Render Backend API를 호출한다.

```env
DAILY_COLLECT_ENDPOINT=https://your-render-backend.onrender.com/api/cron/collect-daily-videos
DAILY_NAVER_TRENDS_ENDPOINT=https://api.be-celeb.org/api/cron/collect-naver-trends
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
CRON_SECRET=your-cron-secret
```

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
