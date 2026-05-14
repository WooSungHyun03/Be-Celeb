# Daily YouTube Collection

Be-Celeb의 카테고리별 인플루언서 영상 수집은 YouTube only로 동작합니다. 다른 플랫폼 수집 로직은 사용하지 않습니다.

## 현재 상태

기존 프로젝트에는 `creator_categories`, `influencer_channels`, `influencer_videos` 테이블과 `/api/collect-daily-videos` 수동 API, YouTube API 유틸이 있었습니다. 하지만 배포 후 매일 자동으로 호출되는 cron 설정과 `CRON_SECRET` 기반 전용 endpoint는 없었습니다.

이번 구조는 다음을 추가합니다.

- `POST /api/cron/collect-daily-videos`
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

수집 기준은 현재 시각 기준 최근 24시간 이내 `published_at`입니다. `youtube_video_id` 기준으로 중복 저장을 막고, 이미 저장된 영상은 조회수/좋아요/댓글 수를 최신 값으로 업데이트합니다.

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
CRON_SECRET=your-secret
```

Vercel Frontend의 `/api` route는 원칙적으로 호출하지 않습니다. `DAILY_COLLECT_ENDPOINT`는 Render Backend API URL로 설정합니다.

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
