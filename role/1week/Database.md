# 이번 주 데이터베이스 구현 가이드

> 현재 구조 기준: DB 작업 파일은 `supabase/schema.sql`, `supabase/policies.sql`, `supabase/seed.sql`이다. 현재 초안에는 `public.users`, `public.user_profiles`, `trends`, `trend_rules`, `recommendations`, `saved_recommendations`가 있다. 이번 주 MVP 기준으로 아래 테이블을 설계하고, 기존 `user_profiles`는 `profiles`로 통일할지 팀 합의가 필요하다.

## 1. 구현 목표

- Supabase Auth의 `auth.users`를 기준으로 사용자 부가정보, 플랜, 배송지, 트렌드/메인 콘텐츠, 로그 테이블을 구성한다.
- 로그인/회원가입 API가 사용할 최소 DB 구조만 먼저 확정한다.
- 메인/트렌드/마이페이지/에러/404에 필요한 seed data와 RLS 정책을 준비한다.
- 결제, LLM 추천, 상점/찜/대시보드 추천 확장 테이블은 이번 주 범위에서 제외한다.

## 2. 제외 범위

- 프론트엔드 UI 구현
- 백엔드 API 구현
- Supabase Auth 로직 구현
- 비밀번호, 세션, 재설정 토큰 별도 테이블
- 결제 테이블
- LLM 추천 테이블
- 상점/찜/대시보드 추천 기능
- 실제 Instagram API 데이터 수집

## 3. 구현 우선순위

1순위:

- `profiles`
- `user_plans`
- `addresses`
- `trends`

2순위:

- `service_contents`
- `sample_recommendations`
- `strategy_articles`

3순위:

- `error_logs`
- `not_found_logs` 또는 `access_logs`

## 4. Supabase Auth 사용 기준

- `auth.users`는 Supabase 기본 제공 테이블을 사용한다.
- 비밀번호, 세션, 이메일 인증, 비밀번호 재설정 토큰은 Supabase Auth 기본 기능을 사용한다.
- 별도 `passwords`, `sessions`, `reset_tokens` 테이블은 만들지 않는다.
- `profiles.user_id`는 `auth.users.id`를 참조한다.
- 현재 `public.users` 테이블은 이미 존재하지만, MVP에서는 `auth.users` 직접 참조 + `profiles` 보조 테이블 방식으로 단순화하는 것을 권장한다. 유지 여부는 팀 합의 필요.

## 5. 필수 테이블 목록

| 테이블 | 현재 상태 | 이번 주 작업 |
| --- | --- | --- |
| `profiles` | 추가 필요. 현재 `user_profiles` 존재 | 사용자 부가정보 테이블로 명칭/필드 확정 |
| `user_plans` | 추가 필요 | 기본 free 플랜과 사용량 관리 |
| `addresses` | 추가 필요 | 배송지 CRUD와 기본 배송지 |
| `trends` | 존재. 필드 보강 필요 | 메인/트렌드 페이지 조회 기준 확정 |
| `service_contents` | 추가 필요 | 메인 서비스 소개 문구 |
| `sample_recommendations` | 추가 필요 | 메인 추천 콘텐츠 샘플 |
| `strategy_articles` | 추가 필요 | 인스타 공략글 |
| `error_logs` | 추가 필요 | 서버 에러 로그 |
| `not_found_logs` 또는 `access_logs` | 추가 필요 | 404 또는 접근 로그. MVP는 `not_found_logs` 권장 |

## 6. 테이블별 필드 정의

### `profiles`

- 목적: 사용자 기본 프로필, 온보딩 상태, 회원탈퇴 상태 관리
- PK: `id`
- FK: `user_id -> auth.users.id`, unique
- 주요 필드:
  - `id`: uuid, 기본값 `gen_random_uuid()`, 필수
  - `user_id`: uuid, 필수, unique
  - `nickname`: text, 필수, unique 권장
  - `instagram_username`: text, 선택, unique는 추후 검토
  - `avatar_url`: text, 선택
  - `onboarding_completed`: boolean, 기본값 `false`, 필수
  - `is_deleted`: boolean, 기본값 `false`, 필수
  - `deleted_at`: timestamptz, 선택
  - `created_at`: timestamptz, 기본값 `now()`, 필수
  - `updated_at`: timestamptz, 기본값 `now()`, 필수
- 인덱스: `user_id`, `nickname`, `instagram_username`

### `user_plans`

- 목적: 사용자별 기본 플랜과 월간 추천 사용량 관리
- PK: `id`
- FK: `user_id -> auth.users.id`, unique
- 주요 필드:
  - `id`: uuid, 기본값 `gen_random_uuid()`, 필수
  - `user_id`: uuid, 필수, unique
  - `plan_name`: text, 기본값 `free`, 필수
  - `monthly_recommendation_limit`: integer, 기본값 `5`, 필수
  - `monthly_recommendation_used`: integer, 기본값 `0`, 필수
  - `renews_at`: timestamptz, 선택
  - `created_at`: timestamptz, 기본값 `now()`, 필수
  - `updated_at`: timestamptz, 기본값 `now()`, 필수
- 인덱스: `user_id`, `plan_name`

### `addresses`

- 목적: 사용자 배송지와 기본 배송지 관리
- PK: `id`
- FK: `user_id -> auth.users.id`
- 주요 필드:
  - `id`: uuid, 기본값 `gen_random_uuid()`, 필수
  - `user_id`: uuid, 필수
  - `recipient_name`: text, 필수
  - `phone`: text, 필수
  - `zipcode`: text, 필수
  - `address1`: text, 필수
  - `address2`: text, 선택
  - `is_default`: boolean, 기본값 `false`, 필수
  - `created_at`: timestamptz, 기본값 `now()`, 필수
  - `updated_at`: timestamptz, 기본값 `now()`, 필수
- 인덱스: `user_id`, `(user_id, is_default)`
- 제약: 사용자별 기본 배송지는 1개만 허용하는 partial unique index 검토

### `trends`

- 목적: 인기 트렌드, 인기 릴스 요약, 키워드 데이터 관리
- 현재 상태: 존재하지만 `type`, `summary`, `hashtags`, `thumbnail_url`, `is_active` 필드 추가 필요
- PK: `id`
- FK: 없음
- 주요 필드:
  - `id`: uuid, 기본값 `gen_random_uuid()`, 필수
  - `title`: text, 필수
  - `category`: text, 필수
  - `type`: text, 필수. 예: `reels`, `keyword`, `trend`
  - `summary`: text, 필수
  - `hashtags`: text[], 기본값 `{}`, 필수
  - `thumbnail_url`: text, 선택
  - `score`: integer, 기본값 `0`, 필수
  - `is_active`: boolean, 기본값 `true`, 필수
  - `created_at`: timestamptz, 기본값 `now()`, 필수
  - `updated_at`: timestamptz, 기본값 `now()`, 필수
- 인덱스: `category`, `type`, `is_active`, `score`

### `service_contents`

- 목적: 메인 페이지 서비스 소개 콘텐츠 관리
- PK: `id`
- FK: 없음
- 주요 필드:
  - `id`: uuid, 기본값 `gen_random_uuid()`, 필수
  - `section`: text, 필수. 예: `hero`, `feature`, `workflow`
  - `title`: text, 필수
  - `description`: text, 필수
  - `sort_order`: integer, 기본값 `0`, 필수
  - `is_active`: boolean, 기본값 `true`, 필수
  - `created_at`: timestamptz, 기본값 `now()`, 필수
  - `updated_at`: timestamptz, 기본값 `now()`, 필수
- 인덱스: `section`, `is_active`, `sort_order`

### `sample_recommendations`

- 목적: 메인 페이지 추천 콘텐츠 샘플 관리
- PK: `id`
- FK: 없음
- 주요 필드:
  - `id`: uuid, 기본값 `gen_random_uuid()`, 필수
  - `title`: text, 필수
  - `category`: text, 필수
  - `hook`: text, 필수
  - `hashtags`: text[], 기본값 `{}`, 필수
  - `summary`: text, 필수
  - `sort_order`: integer, 기본값 `0`, 필수
  - `is_active`: boolean, 기본값 `true`, 필수
  - `created_at`: timestamptz, 기본값 `now()`, 필수
  - `updated_at`: timestamptz, 기본값 `now()`, 필수
- 인덱스: `category`, `is_active`, `sort_order`

### `strategy_articles`

- 목적: 인스타 공략글 데이터 관리
- PK: `id`
- FK: 없음
- 주요 필드:
  - `id`: uuid, 기본값 `gen_random_uuid()`, 필수
  - `title`: text, 필수
  - `category`: text, 필수
  - `summary`: text, 필수
  - `content`: text, 필수
  - `thumbnail_url`: text, 선택
  - `is_active`: boolean, 기본값 `true`, 필수
  - `created_at`: timestamptz, 기본값 `now()`, 필수
  - `updated_at`: timestamptz, 기본값 `now()`, 필수
- 인덱스: `category`, `is_active`, `created_at`

### `error_logs`

- 목적: 서버 에러 로그 저장
- PK: `id`
- FK: `user_id -> auth.users.id`, nullable
- 주요 필드:
  - `id`: uuid, 기본값 `gen_random_uuid()`, 필수
  - `user_id`: uuid, 선택
  - `path`: text, 필수
  - `method`: text, 필수
  - `message`: text, 필수
  - `code`: text, 선택
  - `created_at`: timestamptz, 기본값 `now()`, 필수
- 인덱스: `user_id`, `code`, `created_at`
- 보관 기준: MVP는 30~90일 보관 정책만 문서화, 자동 삭제는 추후

### `not_found_logs`

- 목적: 잘못된 URL 접근 기록
- PK: `id`
- FK: 없음
- 주요 필드:
  - `id`: uuid, 기본값 `gen_random_uuid()`, 필수
  - `path`: text, 필수
  - `referrer`: text, 선택
  - `user_agent`: text, 선택
  - `created_at`: timestamptz, 기본값 `now()`, 필수
- 인덱스: `path`, `created_at`
- 비고: 범용 로그가 필요해지면 `access_logs`로 확장한다.

## 7. RLS 정책

관리자 기능이 아직 없으면 관리자 수정/조회 정책은 추후 적용으로 표시한다. 이번 주에는 공개 조회와 본인 데이터 보호를 우선한다.

| 테이블 | RLS 기준 |
| --- | --- |
| `profiles` | 본인만 조회/수정/insert 가능. `auth.uid() = user_id` |
| `user_plans` | 본인만 조회 가능. insert/update는 백엔드 service role 기준 |
| `addresses` | 본인만 CRUD 가능. `auth.uid() = user_id` |
| `trends` | 전체 조회 가능. insert/update/delete는 관리자 정책 추후 적용 |
| `service_contents` | 전체 조회 가능. insert/update/delete는 관리자 정책 추후 적용 |
| `sample_recommendations` | 전체 조회 가능. insert/update/delete는 관리자 정책 추후 적용 |
| `strategy_articles` | 전체 조회 가능. insert/update/delete는 관리자 정책 추후 적용 |
| `error_logs` | insert 가능. 조회는 관리자만, 관리자 정책은 추후 적용 |
| `not_found_logs` | insert 가능. 조회는 관리자만, 관리자 정책은 추후 적용 |

주의:

- 공개 조회 테이블은 `anon`, `authenticated` 모두 select 허용할지 백엔드와 합의한다.
- 로그 테이블은 민감정보 저장 금지. email, access token, password, full stack trace 저장 금지.
- service role은 RLS를 우회하므로 백엔드에서만 사용한다.

## 8. Seed Data 범위

이번 주 seed는 `supabase/seed.sql`에 최소 데이터만 넣는다. Auth 사용자 seed는 만들지 않는다.

- 서비스 소개 문구: `service_contents` 3~5개
- 추천 콘텐츠 샘플: `sample_recommendations` 3~5개
- 인기 트렌드: `trends` 5개
- 인스타 공략글: `strategy_articles` 3개
- 기본 플랜 free 1개: 사용자별 `user_plans` 기본값 기준으로 처리. 별도 `plans` 테이블은 이번 주 범위 제외

현재 `seed.sql`에는 `trends` 2개와 `trend_rules` 2개만 있다. 이번 주 범위에 맞춰 `service_contents`, `sample_recommendations`, `strategy_articles`, 보강된 `trends` seed가 추가 필요하다.

## 9. 데이터 관계

- `auth.users` 1 : 1 `profiles`
- `auth.users` 1 : 1 `user_plans`
- `auth.users` 1 : N `addresses`
- `trends` 독립 테이블
- `service_contents` 독립 테이블
- `sample_recommendations` 독립 테이블
- `strategy_articles` 독립 테이블
- `error_logs`는 선택적으로 `auth.users`를 참조
- `not_found_logs`는 독립 테이블

## 10. 체크리스트

### Schema

- [ ] `profiles` 테이블 구성 또는 기존 `user_profiles`와 명칭 통일
- [ ] `user_plans` 테이블 구성
- [ ] `addresses` 테이블 구성
- [ ] `trends` 테이블 필드 보강
- [ ] `service_contents` 테이블 구성
- [ ] `sample_recommendations` 테이블 구성
- [ ] `strategy_articles` 테이블 구성
- [ ] `error_logs` 테이블 구성
- [ ] `not_found_logs` 테이블 구성
- [ ] soft delete 필드 적용: `profiles.is_deleted`, `profiles.deleted_at`
- [ ] 모든 주요 테이블에 `created_at`, `updated_at` 기준 적용
- [ ] `updated_at` 자동 갱신 trigger 또는 운영 기준 정리

### RLS

- [ ] 모든 MVP 테이블 RLS 활성화
- [ ] `profiles` 본인 조회/수정 정책 적용
- [ ] `user_plans` 본인 조회 정책 적용
- [ ] `addresses` 본인 CRUD 정책 적용
- [ ] 공개 콘텐츠 테이블 select 정책 적용
- [ ] 로그 테이블 insert 정책 적용
- [ ] 관리자 정책은 추후 적용으로 주석 처리

### Seed

- [ ] 서비스 소개 문구 seed 입력
- [ ] 추천 콘텐츠 샘플 3~5개 seed 입력
- [ ] 인기 트렌드 5개 seed 입력
- [ ] 인스타 공략글 3개 seed 입력
- [ ] 기본 free 플랜 기준값 확정
- [ ] Auth 사용자 seed를 넣지 않도록 확인

### 검증

- [ ] 비로그인 사용자가 공개 콘텐츠를 조회할 수 있음
- [ ] 로그인 사용자가 본인 `profiles`만 조회/수정할 수 있음
- [ ] 로그인 사용자가 본인 `addresses`만 CRUD할 수 있음
- [ ] 다른 사용자의 row 접근이 차단됨
- [ ] 로그 테이블 조회가 일반 사용자에게 차단됨
- [ ] seed 재실행 시 중복 데이터가 과도하게 쌓이지 않도록 기준 정리
