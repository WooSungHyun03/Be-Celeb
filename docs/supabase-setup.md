# Supabase Setup

## Project

1. Supabase에서 Be Celeb production project를 생성합니다.
2. Project URL을 `NEXT_PUBLIC_SUPABASE_URL`에 등록합니다.
3. anon public key를 `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 등록합니다.
4. service role key는 서버 환경변수 `SUPABASE_SERVICE_ROLE_KEY`에만 등록합니다.

## Auth URLs

Supabase Dashboard의 Authentication URL Configuration에 아래 값을 설정합니다.

Site URL:

```txt
https://be-celeb.org
```

Redirect URLs:

```txt
http://localhost:3000/auth/callback
https://be-celeb.org/auth/callback
https://www.be-celeb.org/auth/callback
```

## Database

SQL Editor에서 아래 순서로 검토 후 적용합니다.

1. `supabase/schema.sql`
2. `supabase/policies.sql`
3. `supabase/seed.sql`

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY`는 브라우저에 노출되면 안 됩니다.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 공개 가능하지만 RLS 정책으로 데이터 접근을 제한해야 합니다.
- RLS 정책은 운영 전 팀장과 백엔드 담당자가 반드시 검토합니다.
- Admin 작업은 별도 role claim 또는 서버 전용 API로 분리합니다.
