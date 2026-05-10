# Backend Feedback - 회원가입/로그인 문제 해결 가이드

검토 기준:

- Production: `https://be-celeb.org`, `https://www.be-celeb.org`
- API: `/api/auth/signup`, `/api/auth/login`, `/api/health`
- 관련 코드: `apps/web/src/app/api/auth/*`, `apps/web/src/app/login/page.tsx`, `apps/web/src/app/signup/page.tsx`
- DB 기준: `supabase/schema.sql`

## 1. 현재 확인된 문제

- `GET /login`, `GET /signup`은 `200 OK`로 열림.
- `GET /api/health`는 정상 응답.
- `be-celeb.org`는 `www.be-celeb.org`로 `307` 리다이렉트됨.
- `POST /api/auth/signup`은 `500` 반환.
  - 메시지: `Failed to check nickname availability.`
  - 코드: `SUPABASE_ERROR`
- `POST /api/auth/login`은 없는 계정에 대해 `401` 반환.
  - 이 동작 자체는 정상.
  - 회원가입 실패 때문에 신규 계정 로그인 검증은 불가.
- 로그인/회원가입 페이지 HTML 기준으로 API 호출 연결이 없음.
  - `/api/auth/login`, `/api/auth/signup` 문자열 없음.
  - 버튼이 `type="button"` 상태.
- 현재 로컬 코드에 git conflict marker가 남아 있음.
  - `<<<<<<< HEAD`
  - `=======`
  - `>>>>>>> ...`
  - 이 상태는 빌드/배포 불가.

확인된 conflict marker 대상:

- `apps/web/src/app/api/auth/signup/route.ts`
- `apps/web/src/app/api/auth/login/route.ts`
- `apps/web/src/app/api/auth/logout/route.ts`
- `apps/web/src/app/api/me/route.ts`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/signup/page.tsx`
- `apps/web/src/lib/api/account.ts`
- `apps/web/src/lib/config/env.ts`

## 2. 최우선 해결 순서

1. auth route 파일의 git conflict marker 제거
2. Backend auth API를 현재 Supabase schema에 맞게 수정
3. 회원가입 시 기본 row 생성 책임을 DB trigger와 Backend 중 하나로 정리
4. 로그인/회원가입 페이지에서 실제 API 호출 연결
5. production 환경변수와 Supabase schema 적용 여부 확인
6. 배포 후 production에서 end-to-end 재검증

## 3. Backend 수정 가이드

### 3.1 conflict marker 제거

대상:

- `apps/web/src/app/api/auth/signup/route.ts`
- `apps/web/src/app/api/auth/login/route.ts`
- `apps/web/src/app/api/auth/logout/route.ts`
- `apps/web/src/app/api/me/route.ts`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/signup/page.tsx`
- `apps/web/src/lib/api/account.ts`
- `apps/web/src/lib/config/env.ts`

처리 기준:

- `<<<<<<<`, `=======`, `>>>>>>>` 라인을 모두 제거한다.
- 한쪽 코드를 무조건 선택하지 말고, 현재 프로젝트 구조에 맞는 import 경로만 남긴다.
- 현재 코드가 `@/app/api/_utils/*` 구조를 사용한다면 그 구조로 통일한다.
- 오래된 `@/lib/api/*` helper와 새 `_utils` helper가 섞이지 않게 한다.

완료 기준:

- `rg "<<<<<<<|=======|>>>>>>>" apps/web/src/app/api/auth` 결과가 없어야 한다.

### 3.2 Supabase schema 불일치 수정

현재 DB 기준 필드:

- `profiles`
  - `user_id`
  - `nickname`
  - `instagram_username`
  - `avatar_url`
  - `onboarding_completed`
  - `is_deleted`
  - `deleted_at`
- `user_plans`
  - `user_id`
  - `plan_name`
  - `monthly_recommendation_limit`
  - `monthly_recommendation_used`
  - `renews_at`
- `creator_profiles`
  - `user_id`
  - `instagram_experience`
  - `categories`
  - `follower_range`
  - `upload_frequency`
  - `content_goal`
  - `preferred_style`
  - `onboarding_completed`

사용 금지 또는 제거 대상 필드:

- `profiles.display_name`
- `profiles.phone`
- `profiles.status`
- `user_plans.plan_code`
- `user_plans.status`
- `user_plans.started_at`
- `creator_profiles.category`
- `creator_profiles.platforms`
- `creator_profiles.goals`
- `creator_profiles.onboarding_status`

## 4. 회원가입 API 처리 방향

대상:

- `POST /api/auth/signup`

권장 처리 흐름:

1. `email`, `password`, `nickname` 검증
2. service role client로 `profiles.nickname` 중복 확인
3. `supabase.auth.signUp()` 호출
4. Auth user 생성 성공 후 기본 app row 처리
5. 응답 반환

중요:

- `supabase/schema.sql`에 `on_auth_user_created` trigger가 있으면 Auth user 생성 시 기본 row가 자동 생성된다.
- trigger를 유지한다면 Backend에서는 `insert`가 아니라 `upsert` 또는 `update`를 사용한다.
- 그렇지 않으면 trigger가 만든 row와 Backend insert가 충돌할 수 있다.

권장 방식:

```ts
await serviceRoleClient
  .from("profiles")
  .upsert(
    {
      user_id: user.id,
      nickname,
      instagram_username: null,
      avatar_url: null,
      onboarding_completed: false,
      is_deleted: false,
      deleted_at: null,
    },
    { onConflict: "user_id" },
  );
```

`user_plans`도 현재 schema 기준으로 처리한다.

```ts
await serviceRoleClient
  .from("user_plans")
  .upsert(
    {
      user_id: user.id,
      plan_name: "free",
      monthly_recommendation_limit: 5,
      monthly_recommendation_used: 0,
      renews_at: renewsAt,
    },
    { onConflict: "user_id" },
  );
```

`creator_profiles`도 현재 schema 기준으로 처리한다.

```ts
await serviceRoleClient
  .from("creator_profiles")
  .upsert(
    {
      user_id: user.id,
      categories: [],
      onboarding_completed: false,
    },
    { onConflict: "user_id" },
  );
```

실패 보상 처리:

- Auth user 생성 후 profile/plan 생성이 실패하면 orphan user가 남을 수 있다.
- service role의 `auth.admin.deleteUser(user.id)`로 보상 삭제하거나, error log에 남기고 재처리 기준을 둔다.

## 5. 로그인 API 처리 방향

대상:

- `POST /api/auth/login`

권장 처리 흐름:

1. `email`, `password` 검증
2. `supabase.auth.signInWithPassword()` 호출
3. `profiles`, `user_plans`, `creator_profiles` 조회
4. `profiles.is_deleted === true`면 signOut 후 `403`
5. 성공 시 user payload 반환

주의:

- 현재 schema에는 `profiles.status`가 없다.
- 계정 비활성화 여부는 `profiles.is_deleted` 기준으로 판단한다.

## 6. Frontend 연결 필요 사항

Backend 문제와 별개로 현재 화면에서 API 호출이 연결되지 않은 상태다.

Frontend 담당 수정 대상:

- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/signup/page.tsx`
- 필요 시 `apps/web/src/components/auth/LoginForm.tsx`
- 필요 시 `apps/web/src/components/auth/SignupForm.tsx`

필수 처리:

- form `onSubmit` 구현
- 버튼 `type="submit"` 변경
- `fetch("/api/auth/login")`, `fetch("/api/auth/signup")` 연결
- loading/error 상태 표시
- 성공 시 `router.push("/dashboard")` 또는 `router.push("/onboarding")`
- 중복 제출 방지

프론트엔드가 직접 Supabase Auth를 호출하지 말고 현재 API route를 사용한다.

## 7. Production 환경 점검

Vercel 환경변수 확인:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Supabase 적용 확인:

- `supabase/schema.sql`이 production DB에 반영되어 있는지 확인
- `profiles`, `user_plans`, `creator_profiles` 컬럼이 코드와 일치하는지 확인
- `profiles.nickname` unique index 존재 확인
- `on_auth_user_created` trigger 존재 여부 확인
- RLS policy가 API route/service role 동작을 막지 않는지 확인

현재 `signup`의 `Failed to check nickname availability.`는 아래 가능성이 높다.

- `SUPABASE_SERVICE_ROLE_KEY` 누락 또는 잘못 설정
- production DB에 `profiles` 테이블/컬럼 미적용
- Supabase URL이 다른 프로젝트를 바라봄
- service role client 생성 실패

## 8. 검증 명령

conflict marker 확인:

```powershell
rg "<<<<<<<|=======|>>>>>>>" apps/web/src
```

type check:

```powershell
npm run type-check:web
```

production 회원가입 API:

```powershell
$body = @{
  email = "test@example.com"
  password = "TestPass123!"
  nickname = "testnickname"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://www.be-celeb.org/api/auth/signup" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

production 로그인 API:

```powershell
$body = @{
  email = "test@example.com"
  password = "TestPass123!"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://www.be-celeb.org/api/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

브라우저 검증:

- `/signup`에서 새 계정 생성
- 성공 후 `/onboarding` 또는 `/dashboard` 이동
- 로그아웃 후 `/login`에서 같은 계정 로그인
- 로그인 성공 후 `/api/me`가 user/profile/plan/onboarding 데이터를 반환하는지 확인

## 9. 완료 체크리스트

- [ ] auth route conflict marker 제거
- [ ] auth helper import 경로 통일
- [ ] signup API가 현재 `profiles` schema 사용
- [ ] signup API가 현재 `user_plans` schema 사용
- [ ] signup API가 현재 `creator_profiles` schema 사용
- [ ] DB trigger와 Backend 기본 row 생성 책임 정리
- [ ] login API가 `profiles.is_deleted` 기준 사용
- [ ] login/signup page가 API 호출하도록 연결
- [ ] production env 확인
- [ ] production Supabase schema 적용 확인
- [ ] `npm run type-check:web` 통과
- [ ] 실제 회원가입 성공 확인
- [ ] 실제 로그인 성공 확인
- [ ] 실패 케이스 400/401/409/500 응답 확인

## 10. 최종 판단

현재 상태는 “페이지는 열리지만 회원가입/로그인 플로우는 정상 작동하지 않음”이다.

가장 먼저 해결할 것은 Backend API 코드 충돌 제거와 Supabase schema 불일치 수정이다. 그 다음 Frontend form 제출 연결을 해야 실제 사용자 플로우가 완성된다.