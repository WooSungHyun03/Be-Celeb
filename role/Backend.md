# 백엔드 구현 가이드

> 현재 구조: `apps/web/src/app/api`에 Next.js Route Handler가 있고, `apps/api`에 FastAPI 분석 서버 skeleton이 있다. 프론트엔드가 보는 API 경로는 `/api/*`로 통일한다. 백엔드는 API, 인증, Supabase 연동 호출, 로컬 LLM 호출, 공통 에러 처리를 담당한다. DB 테이블 설계와 UI 구현은 담당하지 않는다.

## 1. 담당 범위

포함:

- `/api/*` Route Handler 구현
- Supabase Auth 연동
- 인증 필요 API의 세션 확인
- 사용자 정보 조회/수정
- 찜 API
- 배송지 API
- 대시보드 API
- 추천 API
- 로컬 LLM API 호출
- 추천 결과 저장 요청
- 추천 사용량 차감
- 공통 에러 응답

제외:

- 프론트엔드 UI 구현
- Supabase 테이블/RLS 설계
- seed data 작성
- 로컬 LLM 서버 운영
- 실제 PG 결제 연동
- 실제 Instagram API 수집
- OpenAI API 사용

## 2. 구현 위치 기준

- 클라이언트-facing API: `apps/web/src/app/api/**/route.ts`
- FastAPI `apps/api`: 추천/분석 로직이 무거워질 때 내부 서비스로 사용 가능
- 현재 OpenAI 기반 파일은 로컬 LLM 호출로 교체 필요:
  - `apps/web/src/app/api/ai/recommend/route.ts`
  - `apps/web/src/lib/openai/*`
  - `apps/api/app/services/openai_*`

## 3. API 목록

| 우선순위 | Method | Path | 인증 | 목적 |
| --- | --- | --- | --- | --- |
| 1 | `POST` | `/api/auth/signup` | 불필요 | 회원가입 |
| 1 | `POST` | `/api/auth/login` | 불필요 | 로그인 |
| 1 | `POST` | `/api/auth/logout` | 필요 | 로그아웃 |
| 1 | `GET` | `/api/me` | 필요 | 내 계정/프로필/플랜 |
| 1 | `POST` | `/api/onboarding` | 필요 | 온보딩 저장 |
| 1 | `GET` | `/api/dashboard` | 필요 | 대시보드 |
| 2 | `POST` | `/api/auth/reset-password` | 불필요 | 재설정 메일 요청 |
| 2 | `PATCH` | `/api/auth/update-password` | 복구 세션 | 새 비밀번호 저장 |
| 2 | `PATCH` | `/api/me/profile` | 필요 | 프로필 수정 |
| 2 | `PATCH` | `/api/me/password` | 필요 | 비밀번호 변경 |
| 2 | `GET` | `/api/home` | 불필요 | 메인 데이터 |
| 2 | `GET` | `/api/trends` | 불필요 | 트렌드 목록 |
| 2 | `GET` | `/api/products` | 불필요 | 상품 목록 |
| 2 | `GET` | `/api/favorites` | 필요 | 찜 목록 |
| 2 | `POST` | `/api/favorites` | 필요 | 찜 추가 |
| 2 | `DELETE` | `/api/favorites/:id` | 필요 | 찜 삭제 |
| 3 | `GET` | `/api/me/addresses` | 필요 | 배송지 목록 |
| 3 | `POST` | `/api/me/addresses` | 필요 | 배송지 추가 |
| 3 | `PATCH` | `/api/me/addresses/:id` | 필요 | 배송지 수정 |
| 3 | `DELETE` | `/api/me/addresses/:id` | 필요 | 배송지 삭제 |
| 3 | `PATCH` | `/api/me/addresses/:id/default` | 필요 | 기본 배송지 설정 |
| 3 | `POST` | `/api/recommendations` | 필요 | 추천 요청/LLM 호출 |
| 3 | `GET` | `/api/recommendations` | 필요 | 추천 결과 목록 |
| 3 | `GET` | `/api/recommendations/:id` | 필요 | 추천 결과 상세 |

4순위/추후:

- 주문/결제 상태 저장 API
- 결제 수단 관리 API
- 관리자 수정 API

## 4. 인증 정책

비로그인 허용:

- `/api/auth/signup`
- `/api/auth/login`
- `/api/auth/reset-password`
- `/api/home`
- `/api/trends`
- `/api/products`
- `/api/health`

로그인 필요:

- `/api/auth/logout`
- `/api/me*`
- `/api/favorites*`
- `/api/dashboard`
- `/api/onboarding`
- `/api/recommendations*`

구현 기준:

- `createSupabaseServerClient()`로 `auth.getUser()` 확인
- 사용자 데이터는 항상 `user.id` 기준 필터
- service role은 서버 전용 생성/수정/로그 저장에만 사용

## 5. 핵심 처리 흐름

### 회원가입/로그인

- signup: 입력 검증 -> Supabase Auth 사용자 생성 -> `profiles`, `creator_profiles`, `user_plans` 기본 row 생성 -> 응답
- login: `signInWithPassword` -> 세션 쿠키 저장 -> 응답
- logout: 세션 확인 -> `signOut`
- reset/update password: Supabase Auth 기본 기능 사용

### 온보딩/대시보드

- onboarding: 세션 확인 -> 입력 검증 -> `creator_profiles` upsert -> 온보딩 완료 상태 저장
- dashboard: 세션 확인 -> profile/creator_profile/user_plan/recommendations/trends/products 요약 조회 -> 응답

### 트렌드/상품/찜

- trends/products: 공개 조회, active 데이터만 반환
- favorites: 세션 확인 -> 대상 타입 검증 -> 중복 방지 -> 추가/삭제/조회
- `type` 값은 `trend`, `product`, `recommendation`로 통일

### 추천 API

- 세션 확인
- 추천 사용량 확인
- 사용자 프로필, 온보딩 정보, 유사 인플루언서, reels mock 분석 데이터 조회
- 로컬 LLM API 호출
- JSON 파싱/검증
- `recommendation_requests`, `recommendations` 저장
- 저장 성공 후 `user_plans.monthly_recommendation_used` 1 증가
- LLM 실패/파싱 실패/저장 실패 시 사용량 차감 금지

## 6. 로컬 LLM 호출 기준

- OpenAI API 사용 금지
- 프론트엔드에서 직접 호출 금지
- 호출 URL: `LOCAL_LLM_API_URL`
- 인증: `LOCAL_LLM_API_KEY`
- 기본 endpoint: `https://llm-api.be-celeb.org/v1/chat/completions`
- 형식: OpenAI 호환 Chat Completions
- 응답은 JSON 문자열로 받고 서버에서 parse/validate

## 7. 공통 응답/에러

성공:

```json
{ "success": true, "data": {} }
```

실패:

```json
{ "success": false, "message": "에러 메시지", "code": "ERROR_CODE" }
```

코드:

- `BAD_REQUEST`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `USAGE_LIMIT_EXCEEDED`
- `LLM_ERROR`
- `INTERNAL_SERVER_ERROR`

## 8. DB 참조 테이블

백엔드는 아래 테이블을 사용하지만, 설계/SQL/RLS는 Database 담당이다.

- `profiles`
- `creator_profiles`
- `user_plans`
- `trends`
- `products`
- `favorites`
- `influencers`
- `reels`
- `recommendation_requests`
- `recommendations`
- `addresses`
- `orders`
- `payments`
- `error_logs`
- `not_found_logs`

## 9. 체크리스트

- [ ] API 경로를 문서 기준으로 통일
- [ ] 공통 auth helper 작성
- [ ] 공통 response/error helper 작성
- [ ] 회원가입/로그인/로그아웃 구현
- [ ] reset/update password 구현
- [ ] `/api/me`, profile/password 구현
- [ ] onboarding/dashboard 구현
- [ ] home/trends/products 조회 구현
- [ ] favorites CRUD 구현
- [ ] addresses CRUD 구현
- [ ] recommendations POST/GET/detail 구현
- [ ] 로컬 LLM 호출 client 구현
- [ ] 추천 사용량 차감 실패 방지
- [ ] OpenAI 관련 호출 제거 또는 비활성화
- [ ] error_logs/not_found_logs 저장 연결
