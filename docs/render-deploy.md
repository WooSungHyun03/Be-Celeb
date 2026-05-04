# Render Deploy

## Web Service 생성

1. Render에서 New Web Service를 생성합니다.
2. GitHub repository를 연결합니다.
3. Root Directory를 `apps/api`로 설정합니다.

## Build Settings

```txt
Root Directory: apps/api
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Environment Variables

Render Environment에 아래 값을 등록합니다.

```txt
FASTAPI_ENV=production
FRONTEND_URL=https://be-celeb.org
API_BASE_URL=https://api.be-celeb.org
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
RESEND_API_KEY=
RESEND_FROM_EMAIL=no-reply@be-celeb.org
```

## Custom Domain

Render Custom Domain에 아래 도메인을 추가합니다.

```txt
api.be-celeb.org
```

Render가 제공하는 DNS 값을 Cloudflare에 등록합니다. 연결 문제가 있으면 Cloudflare record를 `DNS only`로 전환합니다.

## 배포 확인

배포 후 아래 URL을 확인합니다.

```txt
https://api.be-celeb.org/health
```

기대 응답:

```json
{
  "status": "ok",
  "service": "be-celeb-api"
}
```
