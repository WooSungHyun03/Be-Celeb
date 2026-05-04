# Resend Setup

## Resend API

1. Resend Dashboard에서 `be-celeb.org` 도메인을 추가합니다.
2. Dashboard가 제공하는 DNS 레코드를 Cloudflare DNS에 등록합니다.
3. 도메인 인증이 완료되면 API Key를 생성합니다.
4. Vercel과 Render 환경변수에 `RESEND_API_KEY`를 등록합니다.
5. 발신 주소는 `RESEND_FROM_EMAIL=no-reply@be-celeb.org`로 설정합니다.

## Next.js Test API

테스트 이메일 endpoint:

```txt
POST /api/email/test
```

예시 body:

```json
{
  "to": "your-email@example.com",
  "subject": "Be Celeb email test"
}
```

운영 전에 관리자 인증과 rate limit을 반드시 추가해야 합니다.

## Supabase Custom SMTP

Supabase Dashboard의 Custom SMTP에 아래 값을 설정합니다.

```txt
Sender name: Be Celeb
Sender email: no-reply@be-celeb.org
SMTP host: smtp.resend.com
SMTP port: 465 또는 587
SMTP user: resend
SMTP password: RESEND_API_KEY
```

`RESEND_API_KEY` 실제 값은 코드나 문서에 적지 않고 Supabase Dashboard의 secret field에만 입력합니다.
