# Be-Celeb Admin 운영 가이드

Be-Celeb admin은 운영자가 YouTube-only 서비스 데이터를 관리하기 위한 내부 콘솔이다.

## 접속 방법

- URL: `/admin`
- 첫 화면에서 Render Backend의 `ADMIN_SECRET` 값을 입력한다.
- 입력값은 브라우저 `sessionStorage`에 저장되고, admin API 요청마다 `Authorization: Bearer <ADMIN_SECRET>`로 전송된다.
- 로그아웃 버튼을 누르면 sessionStorage 값이 제거된다.

MVP 보호 방식이므로 운영 장기 구조에서는 Supabase Auth 사용자 role 또는 별도 admin role 테이블로 교체하는 것을 권장한다.

## 서비스 구조

```text
Vercel Frontend /admin
→ NEXT_PUBLIC_API_BASE_URL
→ Render FastAPI /api/admin/*
→ Supabase / YouTube API / Local LLM API
```

Vercel에는 서버 비밀키를 넣지 않는다. Supabase service role, YouTube API key, Local LLM key, `ADMIN_SECRET`은 Render Backend에만 설정한다.

## 필요한 환경 변수

Vercel Frontend:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.be-celeb.org
```

Render Backend:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
YOUTUBE_API_KEY=
YOUTUBE_COOKIES_FILE=/etc/secrets/youtube-cookies.txt
# 선택: 기본값은 요청별 temp directory. 지정 시 반드시 /tmp 같은 writable 경로를 사용
YOUTUBE_COOKIES_RUNTIME_PATH=/tmp/youtube-cookies.txt
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
NAVER_SHOPPING_CLIENT_ID=
NAVER_SHOPPING_CLIENT_SECRET=
LOCAL_LLM_API_URL=
LOCAL_LLM_API_KEY=
ADMIN_SECRET=
CRON_SECRET=
ALLOWED_ORIGINS=https://be-celeb.org,https://be-celeb.vercel.app,http://localhost:3000
```

## Admin에서 관리하는 데이터

- `creator_categories`: 카테고리 목록 추가/수정/삭제
- `influencer_channels`: YouTube 채널 추가/수정/활성화/동기화/삭제. 기존 `category_id`는 호환용으로 유지하고 실제 다중 카테고리는 `influencer_channel_categories`에서 관리한다.
- `influencer_videos`: 수집 영상 조회/태그 정규화/삭제. 기존 `category_id`는 호환용으로 유지하고 실제 다중 카테고리는 `influencer_video_categories`에서 관리한다.
- `influencer_channel_categories`: 한 인플루언서 채널을 여러 Be-Celeb 카테고리에 연결하는 join table
- `influencer_video_categories`: 한 영상을 여러 Be-Celeb 카테고리에 연결하는 join table
- `collection_logs`: 수집 이력 조회/정리
- `user_channel_analyses`: 사용자 채널 분석 이력 조회
- `llm_prompt_templates`: 콘텐츠 추천에 사용할 active prompt 관리
- `recommendation_options`: 과거 2단계 추천 옵션 이력 조회
- `content_recommendations`: 최종 콘텐츠 계획 조회/삭제
- `naver_trend_keyword_groups`: Naver DataLab 검색 트렌드 keyword group 관리
- `creator_shop_keywords`: Naver Shopping 장비 섹션별 상품 수집 keyword. 현재 CRUD UI는 TODO
- `creator_shop_products`: Naver Shopping 상품 cache. `/shop`에서 조회
- `admin_audit_logs`: admin 작업 이력 저장

## 인플루언서 채널 추가 방법

1. `/admin` 접속 후 passcode 입력
2. `인플루언서 채널` 섹션 이동
3. 카테고리 1개 이상 선택
4. YouTube 채널 URL 입력
5. `채널 추가`
6. `Sync` 버튼으로 YouTube API 기반 채널 제목, ID, 썸네일, 설명 동기화

채널에 여러 카테고리를 지정하면 daily collector가 새로 수집하는 영상에도 같은 카테고리 묶음을 반영한다. 기존 단일 `category_id` 데이터는 migration에서 join table로 이관되며, legacy API 호환을 위해 첫 번째 카테고리는 `influencer_channels.category_id`, `influencer_videos.category_id`에도 계속 저장한다.

## 수동 수집 방법

`수집 관리` 섹션에서 `지금 수동 수집 실행`을 누른다.

백엔드 호출:

```bash
curl -X POST "$NEXT_PUBLIC_API_BASE_URL/api/admin/collect-now" \
  -H "Authorization: Bearer $ADMIN_SECRET"
```

## 매일 자동 수집 시간

- KST: 매일 06:00
- UTC: 매일 21:00
- cron: `0 21 * * *`

GitHub Actions 또는 Render Cron은 기존 `CRON_SECRET` 기반 수집 endpoint를 호출한다. Admin의 `collect-now`는 운영자 수동 실행용이다.

추가 daily collector:

- `POST /api/cron/collect-naver-trends`
- `POST /api/cron/collect-shop-products`
- `POST /api/cron/collect-growth-report`

`creator_shop_keywords` 관리 UI는 아직 admin에 붙이지 않았다. 운영자가 keyword를 자주 바꾸는 단계가 되면 장비 섹션 기준 `/api/admin/shop-keywords` CRUD와 admin 섹션을 추가한다.

Growth report collector는 `user_channel_settings`의 모든 회원 채널을 기준으로 매일 06:00 KST(`0 21 * * *` UTC)에 `channel_growth_snapshots`, `video_growth_snapshots`를 저장한다. 같은 KST 날짜에 이미 저장된 채널은 중복 갱신하지 않는다. 회원이 YouTube 채널 URL을 다른 채널로 변경하면 기존 growth snapshot은 삭제되고 새 채널 기준으로 다시 시작한다.

Trends의 급상승 키워드는 전체 태그 count만 정렬하지 않고 카테고리별 Top 키워드를 먼저 뽑은 뒤 균형 있게 섞어 표시한다. 검색 관심도 데이터가 있으면 해당 카테고리 키워드에 낮은 가중치로 함께 반영한다. 현재 인기 영상은 `influencer_video_categories` 기준으로 최근 7일 이내 업로드된 영상 중 카테고리별 조회수 TOP 3을 고르며, join table 데이터가 없으면 기존 `influencer_videos.category_id`로 fallback한다. DB가 비어 있거나 카테고리 연결 데이터가 없으면 500 대신 빈 배열/empty state를 반환한다.

Production board는 직접 콘텐츠 생성과 즐겨찾기/추천 전환을 모두 지원한다. 촬영 시작일이 있는 production item은 backend에서 `calendar_events`에 자동 upsert된다. Calendar에서 production-linked event의 날짜를 바꾸면 production item의 촬영일도 갱신된다. 충돌 방지를 위해 production item 제목/콘티/메모는 production-board가 원본이고, calendar는 날짜/색상/상태만 편집한다.

`/shop` 상품 카드는 Naver DataLab 검색어트렌드가 아니라 Naver 검색 API의 쇼핑 검색 endpoint로 daily collector가 수집한 cache를 사용한다. 일반 상품 조회는 Naver API를 즉시 호출하지 않는다. DataLab 검색어트렌드가 정상이어도 쇼핑 검색 권한이 없으면 daily shop collector가 실패할 수 있지만, `/shop`은 기존 cache 또는 기본 추천 장비 fallback을 보여준다. 쇼핑 검색 권한이 있는 별도 앱 키가 있으면 Render Backend에 `NAVER_SHOPPING_CLIENT_ID`, `NAVER_SHOPPING_CLIENT_SECRET`으로 설정한다. 값이 없으면 기존 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 사용한다.

Admin의 `시스템` 섹션에서 `Naver Shopping API 테스트`를 실행하면 secret 값을 노출하지 않고 status code, errorCode, credential source를 확인할 수 있다.

## YouTube 영상 분석 cookie 운영

YouTube 영상 분석은 공개 자막 또는 자동 자막만 조회한다. Render 메모리 사용량을 줄이기 위해 YouTube 오디오 다운로드, 변환, Whisper 전사는 비활성화되어 있다. 일부 자막 조회는 로그인 cookie가 필요할 수 있다.

- `YOUTUBE_COOKIES_FILE` 또는 `YOUTUBE_COOKIES_PATH`: Render secret file 등 원본 cookie 경로. 이 파일은 읽기 전용 source로만 사용한다.
- `YOUTUBE_COOKIES_RUNTIME_PATH`: 선택 값. 지정하지 않으면 요청별 temp directory에 writable copy를 만든다. 지정한다면 `/tmp` 같은 writable 경로만 사용한다.
- `/etc/secrets/youtube-cookies.txt` 같은 secret mount 경로는 read-only일 수 있으므로 `yt-dlp`에 직접 전달하지 않는다.
- cookie 내용과 전체 경로는 로그에 남기지 않는다.

분석 skip 원인은 `YOUTUBE_REQUIRES_COOKIES`, `YOUTUBE_COOKIE_FILE_UNAVAILABLE`, `YOUTUBE_UNAVAILABLE_FOR_ANALYSIS`, `YOUTUBE_AUDIO_ANALYSIS_DISABLED`처럼 코드별로 집계된다. `video_analysis_max_per_collection` 초과로 인한 limit skip은 cookie/unavailable skip과 별도로 집계된다.

## 위험 작업

`위험 작업 구역`에서 다음 작업을 실행할 수 있다.

- 전체 또는 특정 카테고리의 `influencer_videos` 삭제. 다중 카테고리 연결이 있는 영상도 해당 카테고리 위험 삭제 대상에 포함된다.
- inactive `influencer_channels` 일괄 삭제
- 전체 `collection_logs` 삭제

두 작업 모두 확인 입력창에 `DELETE`를 정확히 입력해야 실행된다.

## Backend Admin API

모든 endpoint는 `ADMIN_SECRET` 검증이 필요하다.

- `GET /api/admin/overview`
- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PATCH /api/admin/categories/{category_id}`
- `DELETE /api/admin/categories/{category_id}`
- `GET /api/admin/influencer-channels`
- `POST /api/admin/influencer-channels`
- `PATCH /api/admin/influencer-channels/{channel_id}`
- `DELETE /api/admin/influencer-channels/{channel_id}`
- `POST /api/admin/influencer-channels/{channel_id}/sync`
- `GET /api/admin/videos`
- `GET /api/admin/videos/{video_id}`
- `PATCH /api/admin/videos/{video_id}`
- `DELETE /api/admin/videos/{video_id}`
- `POST /api/admin/collect-now`
- `GET /api/admin/collection-logs`
- `GET /api/admin/analyses`
- `GET /api/admin/recommendations`
- `DELETE /api/admin/recommendations/{recommendation_id}`
- `GET /api/admin/system-status`
- `POST /api/admin/test-youtube`
- `POST /api/admin/test-llm`
- `POST /api/admin/danger/delete-videos-by-category`
- `POST /api/admin/danger/delete-all-videos`
- `POST /api/admin/danger/delete-all-collection-logs`
- `POST /api/admin/danger/delete-inactive-channels`
