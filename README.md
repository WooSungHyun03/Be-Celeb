# Be Celeb

Be Celeb은 인스타그램 릴스, 틱톡, 유튜브 쇼츠 같은 숏폼 SNS 트렌드를 분석하고, 사용자 계정 유형에 맞는 콘텐츠 전략을 추천하는 웹서비스입니다.

이 저장소는 Next.js 웹앱, FastAPI 분석 서버, Supabase, Resend, OpenAI API를 실제 배포 환경에 연결할 수 있는 최소 구조를 제공합니다. API Key와 secret은 코드에 포함하지 않고 환경변수로만 주입합니다.

## 배포 아키텍처

| 영역 | 서비스 |
| --- | --- |
| DNS / 도메인 / Email Routing | Cloudflare |
| Web | Vercel + Next.js |
| API | Render + FastAPI |
| Auth / DB / Storage | Supabase |
| Email 발송 | Resend |
| AI 추천 | OpenAI API |

## 도메인 구조

| Domain | Target |
| --- | --- |
| `https://be-celeb.org` | Vercel Next.js production |
| `https://www.be-celeb.org` | Vercel Next.js production |
| `https://api.be-celeb.org` | Render FastAPI production |

## 사용 스택

- Frontend: Next.js, React, TypeScript, App Router, Tailwind CSS
- Backend for Frontend: Next.js Route Handlers
- Data API: FastAPI, Pydantic, OpenAI Python SDK
- Auth/Database/Storage: Supabase
- Email: Resend
- AI: OpenAI Responses API
- Deployment: Vercel, Render, Cloudflare

## 로컬 실행

### Web

```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

로컬 주소:

```txt
http://localhost:3000
```

### FastAPI

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

로컬 주소:

```txt
http://localhost:8000
```

## Vercel 배포

- Root Directory: `apps/web`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output: Next.js 기본값

배포 후 확인:

```txt
https://be-celeb.org/api/health
```

자세한 내용은 `docs/vercel-deploy.md`를 확인합니다.

## Render 배포

- Root Directory: `apps/api`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

배포 후 확인:

```txt
https://api.be-celeb.org/health
```

자세한 내용은 `docs/render-deploy.md`를 확인합니다.

## Supabase 설정

Supabase Auth 설정:

- Site URL: `https://be-celeb.org`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://be-celeb.org/auth/callback`
  - `https://www.be-celeb.org/auth/callback`

SQL 적용 순서:

1. `supabase/schema.sql`
2. `supabase/policies.sql`
3. `supabase/seed.sql`

자세한 내용은 `docs/supabase-setup.md`를 확인합니다.

## Resend 설정

- 발신 주소: `no-reply@be-celeb.org`
- API Key는 `RESEND_API_KEY`로만 등록합니다.
- Supabase Custom SMTP도 Resend SMTP를 사용하도록 설정할 수 있습니다.

자세한 내용은 `docs/resend-setup.md`를 확인합니다.

## Cloudflare 설정

Cloudflare는 DNS, 도메인 관리, Email Routing을 담당합니다.

- `be-celeb.org`: Vercel 연결
- `www.be-celeb.org`: Vercel 연결
- `api.be-celeb.org`: Render 연결
- `hello@be-celeb.org`: 개인 Gmail forwarding
- `support@be-celeb.org`: 개인 Gmail forwarding
- `no-reply@be-celeb.org`: Resend 발신 주소

자세한 내용은 `docs/cloudflare-setup.md`를 확인합니다.

## OpenAI API 설정

Next.js와 FastAPI 모두 서버 사이드에서만 OpenAI API를 호출합니다.

- Web route: `POST /api/ai/recommend`
- FastAPI route: `POST /recommendations/generate`

`OPENAI_API_KEY`가 없으면 API는 명확한 설정 오류를 반환합니다. 브라우저에는 key가 노출되지 않습니다.

## 환경변수 목록

공통:

```txt
NEXT_PUBLIC_SITE_URL=https://be-celeb.org
NEXT_PUBLIC_API_BASE_URL=https://api.be-celeb.org
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
RESEND_API_KEY=
RESEND_FROM_EMAIL=no-reply@be-celeb.org
FASTAPI_ENV=production
FRONTEND_URL=https://be-celeb.org
API_BASE_URL=https://api.be-celeb.org
```

환경변수 예시 파일:

- `.env.example`
- `apps/web/.env.example`
- `apps/api/.env.example`

## 배포 체크리스트

- [ ] Cloudflare nameserver 적용
- [ ] Vercel `be-celeb.org` 연결
- [ ] Vercel `www.be-celeb.org` 연결
- [ ] Render `api.be-celeb.org` 연결
- [ ] Supabase Site URL / Redirect URL 설정
- [ ] Supabase SQL / RLS 적용
- [ ] Resend 도메인 인증
- [ ] Supabase Custom SMTP 설정
- [ ] Vercel `/api/health` 확인
- [ ] Render `/health` 확인
- [ ] 테스트 이메일 발송 확인
- [ ] AI 추천 API 테스트 확인

상세 체크리스트는 `project-management/deployment-checklist.md`를 사용합니다.

## 문제 해결

- `/api/health`가 실패하면 Vercel Root Directory와 Build Command를 확인합니다.
- `/health`가 실패하면 Render Start Command와 `PORT` 사용 여부를 확인합니다.
- Supabase 인증 redirect가 실패하면 Site URL과 Redirect URLs를 확인합니다.
- Resend 발송이 실패하면 도메인 인증과 `RESEND_FROM_EMAIL`의 verified domain 여부를 확인합니다.
- OpenAI 추천이 실패하면 `OPENAI_API_KEY`, `OPENAI_MODEL`, 계정 billing/rate limit을 확인합니다.
- `api.be-celeb.org` TLS 또는 routing 문제가 생기면 Cloudflare DNS record를 `DNS only`로 바꿔 확인합니다.

## 보안 원칙

- `OPENAI_API_KEY`는 클라이언트에 노출하지 않습니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 클라이언트에 노출하지 않습니다.
- `RESEND_API_KEY`는 클라이언트에 노출하지 않습니다.
- `NEXT_PUBLIC_` 접두사는 공개 가능한 값에만 사용합니다.
- `.env`와 `.env.local`은 Git에 커밋하지 않습니다.
- 테스트 이메일 API는 운영 전 관리자 인증과 rate limit을 추가해야 합니다.
