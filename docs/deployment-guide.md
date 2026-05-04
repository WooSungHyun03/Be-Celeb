# Deployment Guide

Be Celeb production 배포는 Cloudflare, Vercel, Render, Supabase, Resend, OpenAI API 조합을 사용합니다.

## Production Domains

- `https://be-celeb.org`: Vercel Next.js production
- `https://www.be-celeb.org`: Vercel Next.js production
- `https://api.be-celeb.org`: Render FastAPI production

## 상세 문서

- Cloudflare: `docs/cloudflare-setup.md`
- Vercel: `docs/vercel-deploy.md`
- Render: `docs/render-deploy.md`
- Supabase: `docs/supabase-setup.md`
- Resend: `docs/resend-setup.md`

## Environment Policy

- 실제 secret은 코드와 문서에 작성하지 않습니다.
- `.env.example`, `apps/web/.env.example`, `apps/api/.env.example`에는 변수명과 빈 값만 둡니다.
- `NEXT_PUBLIC_` 접두사는 공개 가능한 값에만 사용합니다.
- `OPENAI_API_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 서버 환경변수에만 등록합니다.
