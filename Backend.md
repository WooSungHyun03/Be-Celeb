# 이번 주 백엔드 구현 가이드

> 기준: 현재 프로젝트는 `apps/web`의 Next.js Route Handler가 `/api/*`를 담당하고, `apps/api`의 FastAPI는 분석/추천 mock API 중심이다. 이번 주 사용자 인증/계정 API는 브라우저 세션 쿠키 처리가 필요한 기능이므로 `apps/web/src/app/api`에 구현한다. 새 라우트 파일은 모두 **추가 필요**다.

## 1. 구현 범위

- 로그인/로그아웃 API, Supabase Auth 세션 생성/해제
- 회원가입 API, Supabase Auth 사용자 생성, 기본 프로필/기본 플랜/온보딩 상태 row 생성
- 비밀번호 찾기: 재설정 메일 발송, 새 비밀번호 저장
- 내 계정 정보 조회, 인증 확인, 프로필 조회/수정, 닉네임 변경
- 로그인 사용자 비밀번호 변경
- 배송지 목록/추가/수정/삭제/기본 배송지 설정
- 회원탈퇴 요청 처리: 계정 비활성화 우선, 삭제는 정책 확정 후 적용
- API 공통 에러 응답, 서버 에러 로그 저장
- API 404 응답 기준 정리

## 2. 제외 범위

- 프론트엔드 UI, 페이지, 컴포넌트 구현
- Supabase 테이블 설계, RLS 정책, 마이그레이션 SQL 작성
- mock 데이터 작성/수정
- 결제, 유료 플랜 변경, 구독 관리
- LLM 추천, 트렌드 추천, OpenAI 연동
- 디자인, 레이아웃, 화면 문구 작업

## 3. 필요한 환경변수

현재 `apps/web/src/lib/config/env.ts`와 `apps/web/src/lib/supabase/server.ts` 기준으로 사용한다.

| 이름 | 사용처 | 주의 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 비밀번호 재설정 redirect URL | 예: `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Auth/DB 연결 | public 값 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 사용자 세션 기반 Auth | public 값 |
| `SUPABASE_SERVICE_ROLE_KEY` | 회원가입 후 서버 전용 row 생성, 회원탈퇴 처리 | 서버 전용, 클라이언트 노출 금지 |

이번 주 범위에서는 `OPENAI_API_KEY`, `RESEND_API_KEY`를 사용하지 않는다. 비밀번호 재설정 메일은 Supabase Auth 메일 기능 기준으로 처리한다.

## 4. 인증 정책

| 구분 | API |
| --- | --- |
| 로그인 불필요 | `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/reset-password`, `GET /api/health` |
| 복구 세션 필요 | `PATCH /api/auth/update-password` |
| 로그인 필요 | `POST /api/auth/logout`, `GET /api/me`, `PATCH /api/me/profile`, `PATCH /api/me/password`, 배송지 API 전체, `DELETE /api/me` |

- 로그인 필요 API는 `createSupabaseServerClient()`로 `auth.getUser()`를 먼저 확인한다.
- 사용자별 DB 접근은 `user.id` 기준으로 제한한다.
- 서버 전용 생성/삭제가 필요한 경우에만 `getSupabaseServiceRoleClient()`를 사용한다.

## 5. API 목록

| 우선순위 | Method | Path | 구현 위치 |
| --- | --- | --- | --- |
| 1 | `POST` | `/api/auth/signup` | 추가 필요: `apps/web/src/app/api/auth/signup/route.ts` |
| 1 | `POST` | `/api/auth/login` | 추가 필요: `apps/web/src/app/api/auth/login/route.ts` |
| 1 | `POST` | `/api/auth/logout` | 추가 필요: `apps/web/src/app/api/auth/logout/route.ts` |
| 1 | `GET` | `/api/me` | 추가 필요: `apps/web/src/app/api/me/route.ts` |
| 2 | `POST` | `/api/auth/reset-password` | 추가 필요: `apps/web/src/app/api/auth/reset-password/route.ts` |
| 2 | `PATCH` | `/api/auth/update-password` | 추가 필요: `apps/web/src/app/api/auth/update-password/route.ts` |
| 2 | `PATCH` | `/api/me/profile` | 추가 필요: `apps/web/src/app/api/me/profile/route.ts` |
| 2 | `PATCH` | `/api/me/password` | 추가 필요: `apps/web/src/app/api/me/password/route.ts` |
| 3 | `GET` | `/api/me/addresses` | 추가 필요: `apps/web/src/app/api/me/addresses/route.ts` |
| 3 | `POST` | `/api/me/addresses` | 추가 필요: `apps/web/src/app/api/me/addresses/route.ts` |
| 3 | `PATCH` | `/api/me/addresses/:id` | 추가 필요: `apps/web/src/app/api/me/addresses/[id]/route.ts` |
| 3 | `DELETE` | `/api/me/addresses/:id` | 추가 필요: `apps/web/src/app/api/me/addresses/[id]/route.ts` |
| 3 | `PATCH` | `/api/me/addresses/:id/default` | 추가 필요: `apps/web/src/app/api/me/addresses/[id]/default/route.ts` |
| 3 | `DELETE` | `/api/me` | 추가 필요: `apps/web/src/app/api/me/route.ts` |
| 4 | `GET` | 알 수 없는 `/api/*` | Next.js 기본 404, 필요 시 `not-found` 응답 보강 |

## 6. 기능별 처리 흐름

### `POST /api/auth/signup`

- 목적: 회원가입, 기본 계정 데이터 생성
- 인증: 불필요
- 요청: `email`, `password`, `nickname`
- 처리 순서: 입력 검증 -> `supabase.auth.signUp()` -> 생성된 `user.id` 확인 -> service role로 `profiles`, `user_plans`, `creator_profiles` 기본 row 생성 -> 세션이 있으면 쿠키 저장
- 응답: `{ success: true, data: { user: { id, email }, profile } }`
- 실패: 중복 이메일, 약한 비밀번호, 닉네임 중복, 기본 row 생성 실패

### `POST /api/auth/login`

- 목적: 이메일/비밀번호 로그인
- 인증: 불필요
- 요청: `email`, `password`
- 처리 순서: 입력 검증 -> `supabase.auth.signInWithPassword()` -> 세션 쿠키 저장 -> 사용자 기본 정보 반환
- 응답: `{ success: true, data: { user: { id, email } } }`
- 실패: 잘못된 계정 정보, 비활성화 계정, Supabase Auth 오류

### `POST /api/auth/logout`

- 목적: 현재 세션 로그아웃
- 인증: 로그인 필요
- 요청: 없음
- 처리 순서: `auth.getUser()` 확인 -> `supabase.auth.signOut()` -> 쿠키 제거
- 응답: `{ success: true, data: null }`
- 실패: 세션 없음, Supabase Auth 오류

### `POST /api/auth/reset-password`

- 목적: 비밀번호 재설정 메일 발송
- 인증: 불필요
- 요청: `email`
- 처리 순서: 입력 검증 -> `supabase.auth.resetPasswordForEmail(email, { redirectTo })` 호출 -> 존재 여부 노출 없이 성공 응답
- 응답: `{ success: true, data: null }`
- 실패: 잘못된 이메일 형식, Supabase 메일 설정 오류

### `PATCH /api/auth/update-password`

- 목적: 재설정 링크로 진입한 사용자의 새 비밀번호 저장
- 인증: Supabase recovery session 필요
- 요청: `password`
- 처리 순서: recovery session 확인 -> `supabase.auth.updateUser({ password })` -> 세션 유지 또는 로그아웃 정책 적용
- 응답: `{ success: true, data: null }`
- 실패: 복구 세션 없음/만료, 약한 비밀번호

### `GET /api/me`

- 목적: 내 계정, 프로필, 기본 플랜, 온보딩 상태 조회
- 인증: 로그인 필요
- 요청: 없음
- 처리 순서: `auth.getUser()` -> `profiles`, `user_plans`, `creator_profiles` 조회 -> 필요한 필드만 반환
- 응답: `{ success: true, data: { user, profile, plan, onboarding } }`
- 실패: 세션 없음, 프로필 row 없음

### `PATCH /api/me/profile`

- 목적: 프로필 정보와 닉네임 변경
- 인증: 로그인 필요
- 요청: `nickname`, 선택 필드 `displayName`, `phone`, `marketingAgreed`
- 처리 순서: 세션 확인 -> 닉네임 중복 검사 -> `profiles` 업데이트 -> 변경된 프로필 반환
- 응답: `{ success: true, data: { profile } }`
- 실패: 닉네임 중복, 허용되지 않은 필드, 프로필 없음

### `PATCH /api/me/password`

- 목적: 로그인 상태에서 비밀번호 변경
- 인증: 로그인 필요
- 요청: `currentPassword`, `newPassword`
- 처리 순서: 세션 확인 -> 현재 비밀번호 재인증 -> `auth.updateUser({ password: newPassword })`
- 응답: `{ success: true, data: null }`
- 실패: 현재 비밀번호 불일치, 약한 새 비밀번호, 세션 만료

### `GET /api/me/addresses`

- 목적: 내 배송지 목록 조회
- 인증: 로그인 필요
- 요청: 없음
- 처리 순서: 세션 확인 -> `addresses`에서 `user_id = user.id` 목록 조회 -> 기본 배송지 우선 정렬
- 응답: `{ success: true, data: { addresses } }`
- 실패: 세션 없음, 조회 실패

### `POST /api/me/addresses`

- 목적: 배송지 추가
- 인증: 로그인 필요
- 요청: `recipientName`, `phone`, `postalCode`, `address1`, `address2`, `isDefault`
- 처리 순서: 세션 확인 -> 입력 검증 -> `isDefault`면 기존 기본 배송지 해제 -> 새 배송지 생성
- 응답: `{ success: true, data: { address } }`
- 실패: 필수값 누락, 주소 개수 제한 초과, 저장 실패

### `PATCH /api/me/addresses/:id`

- 목적: 배송지 수정
- 인증: 로그인 필요
- 요청: 수정할 배송지 필드
- 처리 순서: 세션 확인 -> 해당 배송지 소유권 확인 -> 수정 -> 변경 row 반환
- 응답: `{ success: true, data: { address } }`
- 실패: 배송지 없음, 소유자 불일치, 필수값 오류

### `DELETE /api/me/addresses/:id`

- 목적: 배송지 삭제
- 인증: 로그인 필요
- 요청: 없음
- 처리 순서: 세션 확인 -> 소유권 확인 -> 삭제 -> 기본 배송지 삭제 시 남은 첫 배송지를 기본값으로 지정할지 정책 확인
- 응답: `{ success: true, data: null }`
- 실패: 배송지 없음, 소유자 불일치

### `PATCH /api/me/addresses/:id/default`

- 목적: 기본 배송지 설정
- 인증: 로그인 필요
- 요청: 없음
- 처리 순서: 세션 확인 -> 소유권 확인 -> 같은 사용자 배송지 `is_default=false` -> 대상 배송지 `is_default=true`
- 응답: `{ success: true, data: { address } }`
- 실패: 배송지 없음, 소유자 불일치, 업데이트 실패

### `DELETE /api/me`

- 목적: 회원탈퇴 요청 처리
- 인증: 로그인 필요
- 요청: 선택 `reason`
- 처리 순서: 세션 확인 -> `profiles` 또는 별도 상태 필드에 비활성화 기록 -> active session 로그아웃 -> hard delete는 정책 확정 후 service role로 처리
- 응답: `{ success: true, data: null }`
- 실패: 세션 없음, 이미 탈퇴한 계정, 삭제 정책 미확정

### API 404

- 목적: 잘못된 API URL에 404 응답 반환
- 인증: 불필요
- 처리 순서: Next.js 기본 404 사용 -> 필요 시 공통 에러 형식에 맞는 catch-all Route Handler 추가 검토
- 응답: `{ success: false, message: "Not found", code: "NOT_FOUND" }`

## 7. Supabase 연동 기준

테이블 생성 SQL, RLS, 컬럼 확정은 DB 담당 업무다. 백엔드는 아래 테이블/필드를 참조만 한다.

| 테이블 | 현재 상태 | 백엔드 참조 필드 |
| --- | --- | --- |
| `auth.users` | Supabase Auth 기본 | `id`, `email`, `created_at` |
| `profiles` | 추가 필요. 현재 초안은 `public.user_profiles`와 이름 불일치 | `user_id`, `nickname`, `display_name`, `phone`, `status`, `onboarding_completed` |
| `user_plans` | 추가 필요 | `user_id`, `plan_code`, `status`, `started_at` |
| `creator_profiles` | 추가 필요 | `user_id`, `category`, `platforms`, `goals`, `onboarding_status` |
| `addresses` | 추가 필요 | `id`, `user_id`, `recipient_name`, `phone`, `postal_code`, `address1`, `address2`, `is_default` |
| `error_logs` | 추가 필요 | `id`, `user_id`, `method`, `path`, `status_code`, `code`, `message`, `created_at` |

## 8. 공통 에러 응답 형식

```json
{
  "success": false,
  "message": "에러 메시지",
  "code": "ERROR_CODE"
}
```

권장 코드:

- `UNAUTHORIZED`: 세션 없음
- `FORBIDDEN`: 소유권 없음
- `VALIDATION_ERROR`: 요청값 오류
- `DUPLICATE_EMAIL`: 이메일 중복
- `DUPLICATE_NICKNAME`: 닉네임 중복
- `NOT_FOUND`: 대상 없음
- `SUPABASE_ERROR`: Supabase 처리 실패
- `INTERNAL_SERVER_ERROR`: 서버 예외

서버 예외는 응답에 stack을 노출하지 않고 `error_logs`에만 저장한다.

## 9. 구현 우선순위

1순위:

- 회원가입
- 로그인/로그아웃
- 세션 확인
- 내 정보 조회

2순위:

- 프로필 수정
- 비밀번호 재설정 메일
- 새 비밀번호 저장
- 로그인 상태 비밀번호 변경

3순위:

- 배송지 CRUD
- 기본 배송지 설정
- 회원탈퇴

4순위:

- 에러 로그 저장
- API 404 응답 정리

## 10. 체크리스트

### 1순위

- [ ] `POST /api/auth/signup` Route Handler 추가
- [ ] Supabase Auth 사용자 생성 연결
- [ ] 회원가입 후 `profiles`, `user_plans`, `creator_profiles` 기본 row 생성
- [ ] `POST /api/auth/login` Route Handler 추가
- [ ] 로그인 성공 시 Supabase 세션 쿠키 저장 확인
- [ ] `POST /api/auth/logout` Route Handler 추가
- [ ] `GET /api/me` Route Handler 추가
- [ ] 인증 실패 시 `UNAUTHORIZED` 공통 응답 반환

### 2순위

- [ ] `POST /api/auth/reset-password` Route Handler 추가
- [ ] 재설정 redirect URL을 `NEXT_PUBLIC_SITE_URL` 기준으로 구성
- [ ] `PATCH /api/auth/update-password` Route Handler 추가
- [ ] `PATCH /api/me/profile` Route Handler 추가
- [ ] 닉네임 중복 검사 구현
- [ ] `PATCH /api/me/password` Route Handler 추가

### 3순위

- [ ] `GET /api/me/addresses` 구현
- [ ] `POST /api/me/addresses` 구현
- [ ] `PATCH /api/me/addresses/:id` 구현
- [ ] `DELETE /api/me/addresses/:id` 구현
- [ ] `PATCH /api/me/addresses/:id/default` 구현
- [ ] 모든 배송지 API에서 `user_id` 소유권 확인
- [ ] `DELETE /api/me` 회원탈퇴 처리 구현

### 4순위

- [ ] 공통 성공/실패 응답 helper 추가 검토
- [ ] 서버 예외를 `error_logs`에 저장
- [ ] API 404 응답 형식 정리
- [ ] Supabase 오류 메시지를 사용자 응답에 그대로 노출하지 않도록 정리

### 검증

- [ ] 환경변수 누락 시 명확한 500 응답 반환
- [ ] 로그인 전 보호 API 호출 시 401 반환
- [ ] 다른 사용자의 배송지 id로 수정/삭제 시 403 또는 404 반환
- [ ] 회원가입 직후 `GET /api/me`가 정상 응답
- [ ] 비밀번호 재설정 메일 요청은 가입 여부를 노출하지 않음
- [ ] service role key가 클라이언트 번들에 포함되지 않음
