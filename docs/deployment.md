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

이 값들은 브라우저 또는 Vercel UI 서버에서 필요하지 않다. dashboard 추천 요청은 Vercel `/api`가 아니라 `NEXT_PUBLIC_API_BASE_URL`의 Render API로 이동한다.

## Render Backend 환경변수

Render Backend API에는 서버에서만 쓰는 값을 설정한다.

```env
NEXT_PUBLIC_SITE_URL=https://be-celeb.org
ALLOWED_ORIGINS=https://be-celeb.org,https://be-celeb.vercel.app,http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
YOUTUBE_API_KEY=your-youtube-api-key
LOCAL_LLM_API_URL=https://llm-api.be-celeb.org/v1/chat/completions
LOCAL_LLM_API_KEY=your-local-llm-key
LOCAL_LLM_MODEL=local-model
CRON_SECRET=your-cron-secret
```

선택 기능:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
RESEND_API_KEY=
RESEND_FROM_EMAIL=no-reply@be-celeb.org
```

## API Base URL

Frontend API client는 `apps/web/src/lib/client/api.ts`에 있다.

- `getApiBaseUrl()`은 `NEXT_PUBLIC_API_BASE_URL`을 읽는다.
- `apiFetch("/api/...")`는 내부에서 Render Backend URL과 결합한다.
- 예: `/api/recommend-content` → `https://your-render-backend.onrender.com/api/recommend-content`
- `NEXT_PUBLIC_API_BASE_URL`이 없으면 `NEXT_PUBLIC_API_BASE_URL is not configured` 에러를 표시한다.

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

Render Backend API는 `apps/web/src/proxy.ts`에서 `/api/:path*` 요청에 CORS 헤더를 붙인다.

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

## Next.js API Route 원칙

`apps/web/src/app/api/*` route handler는 Render Backend API로 배포되는 서버 코드다. Vercel Frontend에서 이 route handler를 직접 호출하는 구조를 사용하지 않는다.

Frontend 원칙:

```ts
import { apiFetch } from "@/lib/client/api";

await apiFetch("/api/recommend-content", {
  method: "POST",
  body: JSON.stringify(payload),
});
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
6. CORS 오류가 나면 Render의 `ALLOWED_ORIGINS`에 현재 Vercel origin을 추가하고 재배포한다.
7. `Missing required environment variable: YOUTUBE_API_KEY`가 나면 Render Backend 서비스의 환경변수와 재배포 여부를 확인한다.

## Cron

Daily YouTube collection도 Render Backend API를 호출한다.

```env
DAILY_COLLECT_ENDPOINT=https://your-render-backend.onrender.com/api/cron/collect-daily-videos
CRON_SECRET=your-cron-secret
```

Schedule:

```text
0 21 * * *
```

UTC 21:00은 KST 매일 06:00이다.
