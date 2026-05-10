도도리아
dodoria371
음성 채널에서 사용

우성현 — 오전 12:11
# Backend 담당 업데이트 검토 피드백

검토 대상:

- `role/1week/Backend.md`
- `apps/web/src/app/api/**`

Backend-Feedback.md
13KB
우성현 — 오후 9:16
# Backend 인증 기능 검토 피드백

검토 대상:

- `https://be-celeb.org`
- `apps/web/src/app/login/page.tsx`

backend-feedback.md
9KB
﻿
# Backend 인증 기능 검토 피드백

검토 대상:

- `https://be-celeb.org`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/signup/page.tsx`
- `apps/web/src/app/api/auth/signup/route.ts`
- `apps/web/src/app/api/auth/login/route.ts`
- `apps/web/src/lib/api/account.ts`
- `supabase/schema.sql`

## 1. 최종 판단

현재 운영 사이트 기준으로 **회원가입/로그인 기능은 정상 작동하지 않는다.**

화면은 열리지만, 프론트엔드 폼이 API와 연결되어 있지 않고, 백엔드 API도 현재 Supabase schema와 컬럼명이 맞지 않는다.

## 2. 확인한 증상

### 2.1 화면 접근

- `GET https://be-celeb.org/login` → `200 OK`
- `GET https://be-celeb.org/signup` → `200 OK`
- `GET https://be-celeb.org/api/health` → `200 OK`

### 2.2 회원가입 API 실패

요청:

```http
POST https://be-celeb.org/api/auth/signup
```

응답:

```json
{
  "success": false,
  "message": "Failed to check nickname availability.",
  "code": "SUPABASE_ERROR"
}
```

상태 코드: `500`

### 2.3 로그인 API

없는 계정으로 로그인 요청 시:

```json
{
  "success": false,
  "message": "Invalid email or password.",
  "code": "UNAUTHORIZED"
}
```

상태 코드: `401`

이 응답 자체는 정상적인 실패 처리다. 다만 회원가입이 실패하므로 실제 생성 계정으로 로그인 성공 여부는 확인할 수 없다.

## 3. 원인 분석

### 3.1 로그인/회원가입 페이지가 API와 연결되지 않음

현재 파일:

- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/signup/page.tsx`

문제:

- `<form>`은 있으나 `onSubmit`이 없다.
- 버튼이 `type="button"`이다.
- API 호출 함수가 연결되어 있지 않다.
- 입력값 상태 관리도 없다.

결과:

- 사용자가 버튼을 눌러도 실제 로그인/회원가입 요청이 발생하지 않는다.

### 3.2 Backend auth route와 DB schema 컬럼 불일치

현재 백엔드 코드가 사용하는 컬럼:

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

현재 `supabase/schema.sql` 기준 실제 컬럼:

- `profiles.nickname`
- `profiles.instagram_username`
- `profiles.avatar_url`
- `profiles.onboarding_completed`
- `profiles.is_deleted`
- `user_plans.plan_name`
- `user_plans.monthly_recommendation_limit`
- `user_plans.monthly_recommendation_used`
- `user_plans.renews_at`
- `creator_profiles.instagram_experience`
- `creator_profiles.categories`
- `creator_profiles.follower_range`
- `creator_profiles.upload_frequency`
- `creator_profiles.content_goal`
- `creator_profiles.preferred_style`
- `creator_profiles.onboarding_completed`

결과:

- 회원가입 후 profile/plan/creator_profile insert 또는 select 단계에서 실패할 수 있다.
- 로그인 후 profile 조회도 실패할 수 있다.

### 3.3 DB trigger와 Backend signup 책임 충돌 가능성

현재 `schema.sql`에는 Auth user 생성 trigger가 있다.

- `public.handle_new_user()`
- `on_auth_user_created`

이 trigger는 Auth user 생성 시 아래 row를 자동 생성한다.

- `profiles`
- `creator_profiles`
- `user_plans`

그런데 현재 Backend signup API도 같은 row를 직접 insert하려고 한다.

결과:

- 중복 생성 책임이 생긴다.
- trigger가 만든 기본 row와 Backend가 insert하려는 row가 충돌할 수 있다.
- 특히 `profiles.user_id` unique 제약 때문에 insert 실패 가능성이 있다.

### 3.4 운영 Supabase 환경 적용 여부 확인 필요

회원가입 API가 닉네임 중복 확인 단계에서 500을 반환했다.

가능한 원인:

- 운영 Supabase에 `profiles` 테이블이 없거나 schema가 다름
- `SUPABASE_SERVICE_ROLE_KEY` 누락 또는 잘못됨
- service role client가 `profiles` 조회 권한을 얻지 못함
- 현재 배포 코드와 DB schema 버전이 맞지 않음

## 4. 해결 방안

### 4.1 DB schema 기준으로 account helper 수정

파일:

- `apps/web/src/lib/api/account.ts`

수정 방향:

```ts
export const PROFILE_SELECT =
  "user_id,nickname,instagram_username,avatar_url,onboarding_completed,is_deleted,deleted_at";

export const USER_PLAN_SELECT =
  "user_id,plan_name,monthly_recommendation_limit,monthly_recommendation_used,renews_at";

export const CREATOR_PROFILE_SELECT =
  "user_id,instagram_experience,categories,follower_range,upload_frequency,content_goal,preferred_style,onboarding_completed";
```

`toPublicProfile`, `toPublicPlan`, `toPublicOnboarding`, `isInactiveStatus`도 위 필드 기준으로 수정한다.

### 4.2 회원가입 기본 row 생성 책임 하나로 통일

권장안: **DB trigger 유지, Backend는 update/upsert만 수행**

이유:

- Auth user 생성 직후 기본 row 생성을 DB가 보장할 수 있다.
- Backend에서 중복 insert를 줄일 수 있다.

Backend signup 수정 방향:

1. `supabase.auth.signUp()` 호출
2. DB trigger가 기본 row 생성
3. service role로 `profiles.nickname`만 사용자 입력값으로 update
4. `user_plans`, `creator_profiles`는 insert하지 않음
5. 필요 시 누락 row만 upsert

### 4.3 signup route 수정

파일:

- `apps/web/src/app/api/auth/signup/route.ts`

삭제해야 할 현재 insert 필드:

- `display_name`
- `phone`
- `status`
- `plan_code`
- `started_at`
- `category`
- `platforms`
- `goals`
- `onboarding_status`

현재 schema 기준으로 처리:

- `profiles.nickname`
- `profiles.onboarding_completed`
- `creator_profiles.categories`
- `creator_profiles.onboarding_completed`
- `user_plans.plan_name`

### 4.4 login route 수정

파일:

- `apps/web/src/app/api/auth/login/route.ts`

수정 방향:

- `PROFILE_SELECT`를 schema 기준으로 변경
- 비활성화 판단은 `status`가 아니라 `is_deleted` 기준으로 처리

예:

```ts
if (profile?.is_deleted) {
  await supabase.auth.signOut();
  return apiError("Account is inactive.", "FORBIDDEN", 403);
}
```

### 4.5 로그인/회원가입 화면 API 연결

파일:

- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/signup/page.tsx`

필요 작업:

- client component 분리 또는 페이지 자체 `"use client"` 적용
- 입력값 상태 관리
- `onSubmit` 구현
- API 호출 연결
- loading/error/success 상태 표시
- 성공 시 `/dashboard` 또는 `/onboarding` 이동

최소 구현 흐름:

```ts
await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
```

회원가입도 동일하게 `/api/auth/signup` 호출.

### 4.6 운영 환경 확인

확인 필요:

- Vercel 환경변수
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- 운영 Supabase에 최신 `schema.sql` 적용 여부
- 운영 Supabase에 최신 `policies.sql` 적용 여부
- `profiles` 테이블과 service role 접근 가능 여부
- Auth trigger `on_auth_user_created` 적용 여부

## 5. 우선순위

1. 운영 Supabase schema/env 확인
2. `account.ts` select/type/mapper를 현재 schema 기준으로 수정
3. `signup` route에서 없는 컬럼 insert 제거
4. DB trigger와 Backend signup 책임 통일
5. `login` route의 profile 조회/비활성화 기준 수정
6. 로그인/회원가입 페이지를 API에 연결
7. 회원가입 → 로그인 → `/api/me` E2E 테스트

## 6. 검증 시나리오

### 회원가입

- 새 이메일, 새 닉네임으로 회원가입
- 기대 결과:
  - `201`
  - `profiles.nickname` 반영
  - `creator_profiles` 기본 row 존재
  - `user_plans.plan_name = free`

### 로그인

- 방금 생성한 계정으로 로그인
- 기대 결과:
  - `200`
  - Supabase session cookie 저장
  - `/dashboard` 접근 가능

### 내 정보 조회

```http
GET /api/me
```

기대 결과:

```json
{
  "success": true,
  "data": {
    "user": {},
    "profile": {},
    "plan": {},
    "onboarding": {}
  }
}
```

### 실패 케이스

- 잘못된 비밀번호 → `401`
- 중복 닉네임 → `409`
- 삭제 계정 → `403`
- 보호 API 비로그인 호출 → `401`

## 7. 결론

현재 운영 사이트에서 회원가입은 실제로 실패하고 있으며, 로그인/회원가입 화면도 API에 연결되어 있지 않다.

문제의 핵심은 다음 두 가지다.

- 프론트 폼이 인증 API를 호출하지 않음
- 백엔드 인증 API가 현재 Supabase schema와 맞지 않음

따라서 이 기능은 **현재 정상 동작 상태가 아니며**, 위 수정 후 운영 환경에서 E2E 검증이 필요하다.