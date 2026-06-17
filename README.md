# Be Celeb

Be Celeb is a creator operations app for YouTube trend research, content recommendations, growth tracking, production planning, and creator equipment discovery.

This repository contains the existing Be Celeb monorepo:

- `apps/web`: Next.js App Router frontend
- `apps/api`: FastAPI backend for recommendations, trends, collectors, admin operations, and Supabase-backed APIs
- `packages/shared`: shared constants and types
- `supabase`: schema, policies, seed data, and versioned migrations
- `docs`: deployment, admin, collector, recommendation, and Supabase operation notes

Do not commit runtime secrets. This project does not use committed `.env` or `.env.example` files. Configure all environment variables in your shell, Docker runtime, Vercel, Render, Supabase, or GitHub Actions secrets.

## Stack

- Web: Next.js, React, TypeScript, Tailwind CSS
- API: FastAPI, Pydantic, httpx
- Auth and DB: Supabase
- Collectors: YouTube Data API, Naver DataLab, Naver Shopping Search
- LLM: OpenAI-compatible local LLM endpoint configured on the backend
- Deployment: Vercel for web, Render for API, Supabase for database, GitHub Actions or Render Cron for scheduled collection

## Local Setup

Install JavaScript dependencies from the repository root:

```bash
npm install
```

Install Python dependencies for the API:

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Run the web app:

```bash
npm run dev:web
```

Run the API:

```bash
npm run dev:api
```

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:8000`

## Validation Commands

Root scripts currently available:

```bash
npm run typecheck
npm run lint
npm run build
```

API checks:

```bash
python -m compileall apps\api\app
cd apps/api
python -m pytest
```

`npm run lint` currently runs the web TypeScript check. There is no separate ESLint configuration yet.

## Environment Variables

Use these names only. Set real values in the deployment platform or local shell; never commit the values.

### Web, Vercel, and Browser-Safe Variables

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public web origin |
| `NEXT_PUBLIC_API_BASE_URL` | Public backend API origin |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL, safe for browser use |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key, safe for browser use under RLS |
| `ALLOWED_ORIGINS` | Optional comma-separated origins for proxy/CORS behavior |

Only `NEXT_PUBLIC_*` values are bundled into the browser. Do not add service-role keys, API keys, admin secrets, cron secrets, or LLM keys to Vercel frontend variables.

### API, Render, and Server-Only Variables

| Name | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase REST/Auth URL |
| `SUPABASE_ANON_KEY` | Supabase anon key for server-side auth verification |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase service-role key |
| `YOUTUBE_API_KEY` | Server-only YouTube Data API key |
| `NAVER_CLIENT_ID` | Naver API client id |
| `NAVER_CLIENT_SECRET` | Naver API client secret |
| `NAVER_SHOPPING_CLIENT_ID` | Optional shopping-search-specific Naver client id |
| `NAVER_SHOPPING_CLIENT_SECRET` | Optional shopping-search-specific Naver client secret |
| `LOCAL_LLM_API_URL` | Server-only OpenAI-compatible LLM endpoint |
| `LOCAL_LLM_API_KEY` | Optional server-only LLM bearer token |
| `LOCAL_LLM_MODEL` | LLM model identifier |
| `ADMIN_SECRET` | Temporary admin console passcode for backend admin APIs |
| `CRON_SECRET` | Shared secret for collector/cron endpoints |
| `ENVIRONMENT` / `FASTAPI_ENV` | Runtime environment label |
| `LOG_LEVEL` | API log level |
| `FRONTEND_URL` | Canonical frontend origin for CORS |
| `API_BASE_URL` | Canonical backend API origin |

### GitHub Actions Secrets

| Name | Purpose |
| --- | --- |
| `DAILY_COLLECT_ENDPOINT` | Absolute URL for daily YouTube collector |
| `DAILY_NAVER_TRENDS_ENDPOINT` | Absolute URL for Naver trends collector |
| `DAILY_SHOP_PRODUCTS_ENDPOINT` | Absolute URL for shop product collector |
| `DAILY_GROWTH_REPORT_ENDPOINT` | Absolute URL for growth report collector |
| `DAILY_CLEANUP_ENDPOINT` | Optional absolute URL for cleanup collector |
| `CRON_SECRET` | Secret sent as `Authorization: Bearer ...` |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI access token |
| `SUPABASE_PROJECT_REF` | Supabase project reference |
| `SUPABASE_DB_PASSWORD` | Hosted Supabase database password |

Collector endpoint secrets must be plain absolute URLs without query strings or fragments. Put credentials only in `CRON_SECRET`.

## Deployment

### Web on Vercel

- Project root: `apps/web`
- Install command: `npm install`
- Build command: `npm run build`
- Runtime command: Vercel default for Next.js
- Required variables: the browser-safe `NEXT_PUBLIC_*` values listed above

### API on Render

- Root directory: `apps/api`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`
- Required variables: server-only API variables listed above

### Supabase

Database changes are managed with versioned files in `supabase/migrations`.

Useful root commands:

```bash
npm run db:link
npm run db:push
npm run db:push:seed
```

The GitHub workflow `.github/workflows/supabase-db.yml` applies migrations from `main` when Supabase secrets are configured.

### Collectors

Scheduled collection can run from Render Cron or `.github/workflows/collect-daily-videos.yml`.

Important endpoints:

- `POST /api/cron/collect-daily-videos`
- `POST /api/cron/collect-naver-trends`
- `POST /api/cron/collect-shop-products`
- `POST /api/cron/collect-growth-report`
- `POST /api/cron/cleanup-old-data`

Every cron endpoint requires `CRON_SECRET`. Do not place secrets in endpoint query strings.

## Docker

Docker files are included for local parity and platform builds:

```bash
docker compose build
docker compose up
```

Values referenced in `docker-compose.yml` must come from the shell or the Docker runtime environment. Do not commit a local env file.

## Documentation

- [Deployment](docs/deployment.md)
- [Admin operations](docs/admin.md)
- [Daily collection](docs/daily-collection.md)
- [Docker](docs/docker.md)
- [Recommendation flow](docs/recommendation-flow.md)
- [Recommendation system](docs/recommendation-system.md)
- [Supabase setup](docs/supabase-setup.md)
- [QA report](docs/qa-report.md)

## Security Rules

- Never commit `.env`, `.env.local`, `.npmrc`, private keys, dumps, HAR files, logs, or build artifacts.
- Treat `SUPABASE_SERVICE_ROLE_KEY`, `YOUTUBE_API_KEY`, Naver secrets, `LOCAL_LLM_API_KEY`, `ADMIN_SECRET`, `CRON_SECRET`, and GitHub/Supabase tokens as server-only.
- Keep browser-exposed values limited to `NEXT_PUBLIC_*` values that are safe to publish.
- If a real secret is ever committed, remove it from code and rotate or revoke it immediately. Removing it from the latest commit is not enough because Git history may still contain it.
