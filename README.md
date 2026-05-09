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

## 역할별 담당 디렉토리

팀은 3명 역할로 나눕니다.

| 역할 | 주로 수정 가능 | 협의 없이 수정하지 않는 영역 |
| --- | --- | --- |
| Frontend | `apps/web/src/app/`, `apps/web/src/components/`, `apps/web/src/features/`, `apps/web/src/utils/`, `apps/web/src/types/`, `apps/web/src/constants/`, `apps/web/public/` | `apps/web/src/app/api/`, `apps/web/src/lib/`, `apps/api/`, `supabase/` |
| Backend | `apps/api/`, `apps/web/src/app/api/`, `apps/web/src/lib/supabase/`, `apps/web/src/lib/openai/`, `apps/web/src/lib/resend/`, `apps/web/src/lib/config/`, `supabase/` | `apps/web/src/components/`, 화면 페이지 디렉토리, `data-design/` |
| Data/Design | `data-design/`, `apps/web/src/mocks/`, `apps/web/src/constants/`, `apps/api/app/mocks/`, `packages/shared/constants/` | `apps/web/src/app/`, `apps/web/src/components/`, `apps/web/src/app/api/`, `apps/api/app/services/`, `supabase/schema.sql` |

자세한 역할별 파일 목록은 `docs/role-guide.md`와 `docs/role-task-list.md`를 확인합니다.

## Git Conflict 방지 규칙

- 담당 디렉토리 외 파일은 수정하지 않습니다.
- `package.json`, `requirements.txt`, `schema.sql`, `tsconfig.json`, `tailwind.config.ts` 같은 공통 파일은 Jira 티켓을 만들고 수정합니다.
- 매일 작업 시작 전 `develop`을 최신화합니다.
- 작업은 항상 `feature/*`, `fix/*`, `docs/*` 브랜치에서 합니다.
- `main`과 `develop`에는 직접 push하지 않습니다.
- Pull Request를 통해서만 merge합니다.
- 같은 페이지를 두 명이 동시에 수정하지 않습니다.
- mock data 구조 변경 시 Frontend/Backend 모두에게 알립니다.
- API response 형식 변경 시 `docs/api-contract.md`를 먼저 수정합니다.

자세한 규칙은 `docs/git-conflict-prevention.md`를 확인합니다.

## 초보자용 작업 시작 방법

처음 한 번:

```bash
git clone <REPOSITORY_URL>
cd be-celeb
git checkout develop
git pull origin develop
```

매일 작업 시작:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/역할-작업명
```

Frontend 예시:

```bash
git checkout -b feature/frontend-dashboard
cd apps/web
npm install
npm run dev
```

Backend 예시:

```bash
git checkout -b feature/backend-recommendation-api
cd apps/api
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Data/Design 예시:

```bash
git checkout -b feature/data-rulebase
git add data-design apps/web/src/mocks apps/web/src/constants
git commit -m "data: add rulebase and sample trends"
git push origin feature/data-rulebase
```

전체 명령어 가이드는 `docs/beginner-git-guide.md`를 확인합니다.

## 브랜치 전략

- `main`: 배포 가능한 안정 브랜치. 직접 push 금지.
- `develop`: 개발 통합 브랜치. 직접 push 금지.
- `feature/frontend-작업명`: Frontend 작업.
- `feature/backend-작업명`: Backend 작업.
- `feature/data-작업명`: Data 작업.
- `feature/design-작업명`: Design 작업.
- `fix/버그명`: 버그 수정.
- `docs/문서명`: 문서 작업.

예시:

```txt
feature/frontend-landing-page
feature/backend-openai-service
feature/data-rulebase
feature/design-service-copy
fix/cors-error
docs/jira-workflow
```

## PR 규칙

- PR 제목에 Jira 티켓 번호를 포함합니다.
- PR 설명에 작업 내용, 수정한 디렉토리, 테스트 방법을 작성합니다.
- 화면 작업이면 스크린샷을 첨부합니다.
- API 작업이면 요청/응답 예시를 첨부합니다.
- conflict가 있으면 혼자 해결하지 말고 담당자에게 공유합니다.
- API response를 바꿨다면 `docs/api-contract.md` 변경을 PR에 포함합니다.

PR 템플릿은 `.github/pull_request_template.md`를 사용합니다.

## Jira 티켓 규칙

Jira 상태값:

- `Backlog`
- `To Do`
- `In Progress`
- `Code Review`
- `Done`

Epic 예시:

- `FE: Frontend UI`
- `BE: Backend API`
- `DATA: Trend Data and Rulebase`
- `DESIGN: Design and Copy`
- `DEPLOY: Deployment`
- `DOCS: Documentation`

티켓 예시:

- `FE-1 랜딩 페이지 UI 구현`
- `BE-3 OpenAI 추천 API 연결`
- `DATA-2 룰베이스 추천 규칙 작성`
- `DESIGN-1 랜딩 페이지 문구 작성`

자세한 규칙은 `docs/jira-workflow.md`를 확인합니다.

## 역할별 구현해야 하는 기능 요약

Frontend:

- 랜딩, 로그인, 회원가입, 온보딩, 대시보드, 트렌드, 추천, 저장, 가격제 UI
- Header, Sidebar/Navbar, Footer, Button, Card, Input, Badge
- Loading, Empty, Error 상태 UI
- 추천 생성/저장/복사 버튼 UI
- 카테고리/플랫폼 필터와 추천 결과 표시 UI

Backend:

- FastAPI `/health`, `/recommendations/generate`
- Next.js API route
- Supabase Auth/DB 연결
- OpenAI API 호출
- Resend 이메일 발송
- 룰베이스 점수 계산
- API contract, SQL schema, RLS 정책

Data/Design:

- 트렌드 카테고리
- 플랫폼 목록
- 룰베이스 추천 규칙
- 샘플 트렌드와 사용자 프로필
- 서비스 문구, 온보딩 질문, 추천 결과 예시 문구
- 발표용 데이터와 데모 시나리오

자세한 구현 목록은 `docs/role-task-list.md`를 확인합니다.

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
