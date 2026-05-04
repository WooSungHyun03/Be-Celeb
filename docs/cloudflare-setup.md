# Cloudflare Setup

## Domain 연결

1. Cloudflare에 `be-celeb.org` site를 추가합니다.
2. 도메인 구매처에서 nameserver를 Cloudflare가 제공하는 nameserver로 변경합니다.
3. Cloudflare Dashboard에서 nameserver 활성 상태를 확인합니다.

## DNS 목표

| Host | Target | Platform |
| --- | --- | --- |
| `be-celeb.org` | Vercel 제공 값 | Vercel |
| `www.be-celeb.org` | Vercel 제공 값 | Vercel |
| `api.be-celeb.org` | Render 제공 값 | Render |
| Resend records | Resend Dashboard 제공 값 | Resend |

Vercel, Render, Resend에서 제공하는 실제 DNS 값은 각 Dashboard에서 복사해 Cloudflare에 입력합니다.

## Proxy 안내

- Vercel 연결용 record는 Vercel 안내에 따릅니다.
- `api.be-celeb.org`가 Render TLS 인증이나 health check에서 문제를 일으키면 Cloudflare Proxy를 끄고 `DNS only`로 전환합니다.
- Resend 인증용 DNS record는 보통 `DNS only`로 둡니다.

## Email Routing

Cloudflare Email Routing에서 아래 주소를 개인 Gmail로 전달합니다.

```txt
hello@be-celeb.org
support@be-celeb.org
```

`no-reply@be-celeb.org`는 Resend 발신 주소로 사용합니다. 수신용 routing 대상이 아니라 발신 도메인 인증 대상입니다.
