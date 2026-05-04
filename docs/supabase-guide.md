# Supabase Guide

Supabase 실제 설정 절차는 `docs/supabase-setup.md`를 기준으로 합니다.

## 연결 구조

- Browser client: `apps/web/src/lib/supabase/client.ts`
- Server cookie client: `apps/web/src/lib/supabase/server.ts`
- Server service-role client: `apps/web/src/lib/supabase/server.ts`
- SQL schema: `supabase/schema.sql`
- RLS policies: `supabase/policies.sql`

## 운영 주의사항

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 사이드에서만 사용합니다.
- 브라우저는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`만 사용합니다.
- RLS 정책은 운영 전 반드시 검토합니다.
- Auth redirect URL은 `docs/supabase-setup.md`의 값을 사용합니다.
