# 데이터베이스 구현 가이드

> 현재 DB 작업 파일은 `supabase/schema.sql`, `supabase/policies.sql`, `supabase/seed.sql`이다. 현재 초안에는 `public.users`, `public.user_profiles`, `trends`, `trend_rules`, `recommendations`, `saved_recommendations`만 있다. MVP에서는 `auth.users` 직접 참조와 아래 테이블명으로 통일한다.

## 1. 담당 범위

포함:

- Supabase 테이블 설계
- 필드/관계/인덱스 정의
- RLS 정책
- seed data 기준
- Auth 기본 테이블 사용 기준

제외:

- 프론트엔드 화면 구현
- 백엔드 API 구현
- Supabase Auth API 구현
- 실제 PG 결제 연동
- 실제 Instagram API 연동
- LLM 호출 로직
- 관리자 페이지

## 2. MVP 우선순위

1순위:

- `profiles`
- `creator_profiles`
- `user_plans`
- `trends`
- `products`
- `favorites`

2순위:

- `influencers`
- `reels`
- `recommendation_requests`
- `recommendations`
- `addresses`

3순위:

- `service_contents`
- `sample_recommendations`
- `error_logs`
- `not_found_logs`

4순위/추후:

- `orders`
- `payments`
- `plans` 고도화
- 관리자 수정 이력

## 3. Supabase Auth 기준

- `auth.users`는 Supabase 기본 테이블 사용
- 비밀번호, 세션, 비밀번호 재설정 토큰은 Supabase Auth 기본 기능 사용
- 별도 password/session/token 테이블 생성 금지
- `profiles.user_id`는 `auth.users.id` 참조
- 현재 `public.users`, `user_profiles`는 `profiles` 기준으로 정리 필요

## 4. 필수 테이블

| 테이블 | 상태 | 목적 |
| --- | --- | --- |
| `profiles` | 추가 필요 | 닉네임, 인스타 ID, 계정 상태 |
| `creator_profiles` | 추가 필요 | 온보딩/콘텐츠 프로필 |
| `user_plans` | 추가 필요 | 플랜/추천 사용량 |
| `trends` | 존재, 보강 필요 | 트렌드/키워드 |
| `products` | 추가 필요 | 상품 목록 |
| `favorites` | 추가 필요 | 찜 |
| `influencers` | 추가 필요 | 유사 인플루언서 mock |
| `reels` | 추가 필요 | 릴스 mock 분석 |
| `recommendation_requests` | 추가 필요 | 추천 요청 저장 |
| `recommendations` | 존재, 재설계 필요 | 추천 결과 저장 |
| `addresses` | 추가 필요 | 배송지 |
| `service_contents` | 추가 필요 | 메인 소개 |
| `sample_recommendations` | 추가 필요 | 추천 샘플 |
| `error_logs` | 추가 필요 | 서버 에러 |
| `not_found_logs` | 추가 필요 | 404 접근 |
| `orders`, `payments` | 추가 필요, 4순위 | 주문/결제 상태 저장 |

## 5. 테이블별 핵심 필드

| 테이블 | PK/FK | 핵심 필드 | 인덱스 |
| --- | --- | --- | --- |
| `profiles` | `id`, `user_id -> auth.users.id` unique | `nickname`, `instagram_username`, `avatar_url`, `is_deleted=false`, `deleted_at`, `created_at`, `updated_at` | `user_id`, `nickname` |
| `creator_profiles` | `id`, `user_id -> auth.users.id` unique | `instagram_experience`, `categories text[]`, `follower_range`, `upload_frequency`, `content_goal`, `preferred_style`, `onboarding_completed=false`, `created_at`, `updated_at` | `user_id`, `onboarding_completed` |
| `user_plans` | `id`, `user_id -> auth.users.id` unique | `plan_name='free'`, `monthly_recommendation_limit=5`, `monthly_recommendation_used=0`, `renews_at`, `created_at`, `updated_at` | `user_id`, `plan_name` |
| `trends` | `id` | `title`, `type`, `category`, `summary`, `keywords text[]`, `hashtags text[]`, `thumbnail_url`, `is_active=true`, `created_at`, `updated_at` | `type`, `category`, `is_active` |
| `products` | `id` | `name`, `category`, `price`, `image_url`, `purchase_url`, `description`, `is_active=true`, `created_at`, `updated_at` | `category`, `is_active` |
| `favorites` | `id`, `user_id -> auth.users.id` | `type`, `target_id`, `title`, `metadata jsonb`, `created_at` | `user_id`, unique `(user_id,type,target_id)` |
| `influencers` | `id` | `username`, `category`, `keywords text[]`, `hashtags text[]`, `follower_count`, `created_at` | `category`, `username` |
| `reels` | `id`, `influencer_id -> influencers.id` | `title`, `topic`, `format`, `hook`, `hashtags text[]`, `views`, `likes`, `comments`, `saves`, `created_at` | `influencer_id`, `topic` |
| `recommendation_requests` | `id`, `user_id -> auth.users.id` | `input_snapshot jsonb`, `created_at` | `user_id`, `created_at` |
| `recommendations` | `id`, `user_id -> auth.users.id`, `request_id -> recommendation_requests.id` | `result jsonb`, `raw_llm_output jsonb`, `created_at` | `user_id`, `request_id` |
| `addresses` | `id`, `user_id -> auth.users.id` | `recipient_name`, `phone`, `zipcode`, `address1`, `address2`, `is_default=false`, `created_at`, `updated_at` | `user_id`, `(user_id,is_default)` |
| `service_contents` | `id` | `section`, `title`, `description`, `is_active=true`, `created_at`, `updated_at` | `section`, `is_active` |
| `sample_recommendations` | `id` | `title`, `category`, `hook`, `hashtags text[]`, `summary`, `is_active=true`, `created_at`, `updated_at` | `category`, `is_active` |
| `error_logs` | `id`, `user_id -> auth.users.id` nullable | `path`, `method`, `message`, `code`, `created_at` | `user_id`, `created_at` |
| `not_found_logs` | `id` | `path`, `referrer`, `user_agent`, `created_at` | `path`, `created_at` |

4순위:

- `orders`: `id`, `user_id`, `status`, `total_amount`, `created_at`, `updated_at`
- `payments`: `id`, `user_id`, `order_id`, `status`, `amount`, `paid_at`, `created_at`

## 6. 데이터 관계

- `auth.users` 1:1 `profiles`
- `auth.users` 1:1 `creator_profiles`
- `auth.users` 1:1 `user_plans`
- `auth.users` 1:N `favorites`
- `auth.users` 1:N `addresses`
- `auth.users` 1:N `recommendation_requests`
- `recommendation_requests` 1:N `recommendations`
- `influencers` 1:N `reels`
- `orders` 1:N `payments`는 4순위

## 7. RLS 정책

| 테이블 | 정책 |
| --- | --- |
| `profiles` | 본인만 조회/수정/insert |
| `creator_profiles` | 본인만 조회/수정/insert |
| `user_plans` | 본인만 조회, 변경은 service role |
| `addresses` | 본인만 CRUD |
| `favorites` | 본인만 CRUD |
| `recommendation_requests` | 본인만 조회, 생성은 본인 또는 service role |
| `recommendations` | 본인만 조회, 생성은 service role |
| `trends`, `products`, `influencers`, `reels`, `service_contents`, `sample_recommendations` | 전체 조회 가능, 수정은 관리자 추후 적용 |
| `error_logs`, `not_found_logs` | insert 가능, 조회는 관리자 추후 적용 |
| `orders`, `payments` | 본인 조회, 생성/수정은 service role. 4순위 |

## 8. Seed Data

MVP seed:

- 서비스 소개 3개
- 추천 콘텐츠 샘플 3개
- 인기 트렌드 5개
- 상품 5개
- mock 인플루언서 5명
- mock reels 10개
- 기본 user_plan 값은 회원가입 시 생성. 별도 `plans` seed는 추후

주의:

- Auth 사용자 seed 금지
- 실제 Instagram 수집 데이터 금지
- 재실행 시 중복 방지를 위한 unique/upsert 기준 정리

## 9. 체크리스트

- [ ] `profiles`로 사용자 프로필 명칭 통일
- [ ] `creator_profiles` 구성
- [ ] `user_plans` 구성
- [ ] `trends` 보강
- [ ] `products` 구성
- [ ] `favorites` 구성
- [ ] `influencers`, `reels` 구성
- [ ] `recommendation_requests`, `recommendations` 구성
- [ ] `addresses` 구성
- [ ] `service_contents`, `sample_recommendations` 구성
- [ ] `error_logs`, `not_found_logs` 구성
- [ ] RLS 활성화
- [ ] FK/unique/index 확인
- [ ] seed data 입력
- [ ] soft delete 기준 정리
- [ ] `updated_at` 처리 기준 정리
