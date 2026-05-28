# Daily YouTube Collection

Be-Celeb의 카테고리별 인플루언서 영상 수집은 YouTube only로 동작합니다. 다른 플랫폼 수집 로직은 사용하지 않습니다.

## 현재 상태

기존 프로젝트에는 `creator_categories`, `influencer_channels`, `influencer_videos` 테이블과 `/api/collect-daily-videos` 수동 API, YouTube API 유틸이 있었습니다. 하지만 배포 후 매일 자동으로 호출되는 cron 설정과 `CRON_SECRET` 기반 전용 endpoint는 없었습니다.

이번 구조는 다음을 추가합니다.

- `POST /api/cron/collect-daily-videos`
- `POST /api/cron/cleanup-old-data`
- GitHub Actions scheduled workflow: `.github/workflows/collect-daily-videos.yml`
- Supabase migration: `supabase/migrations/20260514000000_daily_youtube_collection.sql`
- collection log table: `collection_logs`

배포만으로 즉시 자동 수집이 되는 것은 아닙니다. 배포 후 `YOUTUBE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`을 설정하고 Render Cron Job 또는 GitHub Actions secrets를 연결해야 매일 실행됩니다.

## 수집 시간

- KST: 매일 오전 06:00
- UTC: 매일 21:00
- Cron: `0 21 * * *`

## 인플루언서 유튜브 링크 입력 위치

운영에서는 Supabase `public.influencer_channels` 테이블에 입력합니다. `channel_url`만 먼저 입력해도 수집 시 YouTube API로 `youtube_channel_id`, `channel_title`, `description`, `thumbnail_url`을 갱신합니다.

```sql
insert into public.influencer_channels (category_id, channel_url, is_active)
select id, 'https://www.youtube.com/@somecreator', true
from public.creator_categories
where name = 'IT';
```

중지할 채널은 삭제하지 말고 비활성화합니다.

```sql
update public.influencer_channels
set is_active = false
where channel_url = 'https://www.youtube.com/@somecreator';
```

기본 카테고리는 다음 11개입니다.

```txt
게임, 운동, IT, 노래, OTT, 일상, 뷰티, 스터디, 코미디, 먹방, 춤
```

## 매일 수집되는 정보

채널 정보는 `influencer_channels`에 갱신됩니다.

- `youtube_channel_id`
- `channel_title`
- `channel_url`
- `description`
- `thumbnail_url`
- `category_id`
- `updated_at`

채널이 여러 카테고리에 속하면 `influencer_channel_categories`에 모든 연결을 저장한다. `category_id`는 기존 API 호환을 위해 첫 번째 카테고리를 계속 보관한다.

영상 정보는 `influencer_videos`에 upsert됩니다.

- `youtube_video_id`
- `published_at`
- `title`
- `description`
- `thumbnails`
- `tags`
- `view_count`
- `like_count`
- `comment_count`
- `category_id`
- `influencer_channel_id`
- `youtube_channel_id`
- `raw`
- `collected_at`

수집 기준은 현재 시각 기준 최근 24시간 이내 `published_at`입니다. `youtube_video_id` 기준으로 중복 저장을 막고, 이미 저장된 영상은 조회수/좋아요/댓글 수를 최신 값으로 업데이트합니다. 채널의 다중 카테고리 연결은 새로 수집된 영상의 `influencer_video_categories`에도 복사되며, `influencer_videos.category_id`는 첫 번째 카테고리 fallback 값으로 유지합니다.

## 필요한 환경 변수

Render Backend API 런타임에 설정합니다.

```txt
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
YOUTUBE_API_KEY=
CRON_SECRET=
```

`YOUTUBE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`은 서버에서만 사용하며 프론트엔드에 노출하지 않습니다.

## Render Cron Job 설정

Render Cron Job에서 endpoint를 호출합니다.

```sh
curl --fail-with-body -X POST "$DAILY_COLLECT_ENDPOINT" \
  -H "Authorization: Bearer $CRON_SECRET"
```

설정값:

```txt
Schedule: 0 21 * * *
Timezone: UTC
KST 기준: 매일 다음날 06:00
DAILY_COLLECT_ENDPOINT=https://your-render-backend.onrender.com/api/cron/collect-daily-videos
CRON_SECRET=your-secret
```

## GitHub Actions 설정

`.github/workflows/collect-daily-videos.yml`이 매일 UTC 21:00에 endpoint를 호출합니다.

GitHub repository secrets:

```txt
DAILY_COLLECT_ENDPOINT=https://your-render-backend.onrender.com/api/cron/collect-daily-videos
DAILY_NAVER_TRENDS_ENDPOINT=https://your-render-backend.onrender.com/api/cron/collect-naver-trends
DAILY_SHOP_PRODUCTS_ENDPOINT=https://your-render-backend.onrender.com/api/cron/collect-shop-products
DAILY_GROWTH_REPORT_ENDPOINT=https://your-render-backend.onrender.com/api/cron/collect-growth-report
# 선택: 없으면 DAILY_COLLECT_ENDPOINT origin에서 /api/cron/cleanup-old-data를 추론
DAILY_CLEANUP_ENDPOINT=https://your-render-backend.onrender.com/api/cron/cleanup-old-data
CRON_SECRET=your-secret
```

Vercel Frontend의 `/api` route는 원칙적으로 호출하지 않습니다. 모든 `DAILY_*_ENDPOINT`는 Render Backend API URL로 설정합니다.

`curl: (3) URL rejected: Malformed input to a URL function`가 나오면 `DAILY_*_ENDPOINT` secret 값이 비어 있거나 URL이 아닌 문자열이다. GitHub Secrets에는 따옴표나 줄바꿈 없이 `https://.../api/cron/...` 한 줄만 저장합니다.

`curl: (28) Operation timed out after 60002 milliseconds with 0 bytes received`가 나오면 URL은 맞지만 backend의 YouTube collector가 60초 안에 응답을 시작하지 못한 것이다. active influencer channel 수가 많거나 YouTube/Supabase 응답이 느리면 정상적으로 60초를 넘을 수 있다. 워크플로는 YouTube 수집 step을 `--max-time 600`으로 기다리며, backend는 채널을 제한 병렬 처리해 전체 소요 시간을 줄인다. POST collector는 중복 수집을 피하기 위해 curl retry를 사용하지 않는다.

Growth report daily collector는 `DAILY_GROWTH_REPORT_ENDPOINT`로 `POST /api/cron/collect-growth-report`를 호출한다. 이 endpoint는 `user_channel_settings`에 저장된 모든 회원 채널의 채널/영상 스냅샷을 저장한다.

DB cleanup은 같은 workflow에서 `POST /api/cron/cleanup-old-data`를 호출한다. `DAILY_CLEANUP_ENDPOINT` secret이 없으면 `DAILY_COLLECT_ENDPOINT`의 backend origin을 재사용한다. cleanup은 batch 단위로 오래된 collector/job 로그, metadata-only 분석 결과, 오래된 인플루언서 영상, 오래된 growth snapshot을 정리하고 사용자 추천/즐겨찾기/제작보드 데이터는 직접 삭제하지 않는다.

## 수동 테스트

로컬 또는 배포 endpoint에 직접 호출합니다.

```sh
curl -X POST "$DAILY_COLLECT_ENDPOINT" \
  -H "Authorization: Bearer $CRON_SECRET"
```

대체 헤더도 지원합니다.

```sh
curl -X POST "$DAILY_COLLECT_ENDPOINT" \
  -H "x-cron-secret: $CRON_SECRET"
```

정상 응답 예시:

```json
{
  "ok": true,
  "scheduledTime": "Every day 06:00 KST",
  "collectedAt": "2026-05-14T21:00:00.000Z",
  "windowStart": "2026-05-13T21:00:00.000Z",
  "windowEnd": "2026-05-14T21:00:00.000Z",
  "categoriesChecked": 11,
  "channelsChecked": 42,
  "videosFoundLast24h": 15,
  "videosUpserted": 15,
  "errors": []
}
```

`CRON_SECRET`이 없거나 틀리면 수집하지 않고 오류를 반환합니다. 일부 채널 수집 실패는 전체 job을 중단하지 않고 `errors` 배열에 모읍니다.
