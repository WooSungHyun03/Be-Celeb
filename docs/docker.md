# Docker Deployment

## 구조

Be-Celeb은 Docker 기준으로도 기존 monorepo를 그대로 사용한다.

```text
apps/web  - Next.js frontend
apps/api  - FastAPI backend
Supabase  - external managed service
Local LLM - external API
YouTube   - external API
```

Backend는 도메인 중심으로 정리했다.

- `users`: account, delete account, user channel settings
- `admin`: categories, influencer channels, videos, prompt templates, danger operations
- `recommendations`: content recommendation generation and result lookup
- `trends`: popular videos and keyword trends
- `collection`: daily collector cron endpoint
- `youtube`: YouTube API wrapper facade
- `llm`: Local LLM wrapper facade
- `database`: Supabase repository facade

공통 계층은 `apps/api/app/core`와 `apps/api/app/common`에 둔다.

- `core/config.py`: runtime environment settings
- `core/logging.py`: shared logger setup
- `core/exceptions.py`: shared exception types
- `core/responses.py`: shared response envelope helpers
- `core/security.py`: admin/cron secret verification
- `core/cors.py`: ALLOWED_ORIGINS based CORS
- `common/*`: text, datetime, pagination, validation helpers

Frontend는 도메인 API wrapper를 `apps/web/src/lib/api`에 둔다.

- `client.ts`: shared backend fetch client
- `users.ts`: account/channel settings APIs
- `recommendations.ts`: recommendation APIs
- `trends.ts`: trends APIs
- `admin.ts`: admin APIs

## Env 파일을 만들지 않는 이유

이 프로젝트는 Docker 이미지, 문서, 코드에 secret을 포함하지 않는다. `.env`와 `.env.example` 파일도 사용하지 않는다.

필요한 값은 다음 중 하나로 런타임에 주입한다.

- shell environment
- Docker Compose variable interpolation
- Render service environment
- Vercel project environment
- 내부 환경 설정 시스템

실제 secret 값은 문서에 기록하지 않는다.

## Backend Build

repo root에서 실행한다.

```bash
docker build -f apps/api/Dockerfile -t be-celeb-api .
```

실행 예시:

```bash
docker run --rm -p 8000:8000 \
  -e PORT=8000 \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  -e SUPABASE_URL \
  -e SUPABASE_SERVICE_ROLE_KEY \
  -e YOUTUBE_API_KEY \
  -e LOCAL_LLM_API_URL \
  -e LOCAL_LLM_API_KEY \
  -e ADMIN_SECRET \
  -e CRON_SECRET \
  be-celeb-api
```

## Frontend Build

repo root에서 실행한다.

```bash
docker build -f apps/web/Dockerfile -t be-celeb-web .
```

Next.js의 `NEXT_PUBLIC_*` 값은 브라우저 번들에서 사용된다. Docker 이미지 빌드/실행 환경에서 같은 값을 관리해야 한다.

실행 예시:

```bash
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -e NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 \
  -e NEXT_PUBLIC_SUPABASE_URL \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY \
  be-celeb-web
```

## Compose

Compose는 Supabase/LLM을 컨테이너로 띄우지 않는다. 둘 다 외부 서비스로 유지한다.

```bash
docker compose up --build
```

Compose 파일에는 실제 secret 값을 쓰지 않는다. 실행 전 shell에 필요한 값을 설정한다.

## Render Docker 배포

Render backend는 `apps/api/Dockerfile`을 사용한다.

- Root Directory: repo root
- Dockerfile Path: `apps/api/Dockerfile`
- Health Check Path: `/health`
- Runtime env: Render Environment 탭에서 설정

Daily collector는 GitHub Actions 또는 Render Cron이 backend endpoint를 호출한다.

```text
POST /api/cron/collect-daily-videos
Authorization: Bearer <CRON_SECRET>
```

KST 매일 06:00 기준 cron은 UTC `0 21 * * *`이다.
