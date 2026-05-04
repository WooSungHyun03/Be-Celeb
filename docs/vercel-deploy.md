# Vercel Deploy

## Project 연결

1. Vercel에서 GitHub repository를 import합니다.
2. Root Directory를 `apps/web`으로 설정합니다.
3. Framework Preset은 Next.js를 사용합니다.

## Build Settings

```txt
Root Directory: apps/web
Install Command: npm install
Build Command: npm run build
Output Directory: Next.js 기본값
```

## Environment Variables

Vercel Project Settings에 아래 값을 등록합니다.

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
```

## Domains

Vercel Domains에 아래 도메인을 연결합니다.

```txt
be-celeb.org
www.be-celeb.org
```

Vercel이 제시하는 DNS 값을 Cloudflare에 등록합니다.

## 배포 확인

배포 후 아래 URL을 확인합니다.

```txt
https://be-celeb.org/api/health
https://www.be-celeb.org/api/health
```

기대 응답:

```json
{
  "status": "ok",
  "service": "be-celeb-web"
}
```
