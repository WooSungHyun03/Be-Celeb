# Supabase Skeleton

이 디렉터리는 Be Celeb의 Supabase Auth와 Database 연결을 위한 SQL 초안입니다.

운영 적용 전에는 팀장이 Supabase Dashboard에서 SQL을 순서대로 검토하고 적용합니다.

## 파일 설명

- `schema.sql`: users, user_profiles, trends, trend_rules, recommendations, saved_recommendations 테이블 초안
- `seed.sql`: 발표/데모용 seed data 초안
- `policies.sql`: RLS 정책 초안

## 연결 예정 위치

- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/lib/supabase/server.ts`

## TODO

- 실제 Supabase project 생성
- Auth Site URL과 Redirect URL 설정
- SQL migration 전략 확정
- Auth provider 정책 확정
- RLS policy review
- service role key 관리 방식 확정
