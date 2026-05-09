# 전체 역할 문서 검토 결과

## 1. 역할 충돌 검토

- Frontend: 화면, 라우팅, 폼, API 호출 연결, UI 상태 처리로 제한했다. 백엔드 API/DB/LLM 직접 호출은 제외했다.
- Backend: `/api/*` 구현, Supabase Auth 연동, 서버 사이드 LLM 호출, 추천 사용량 차감으로 제한했다. DB 설계와 UI 구현은 제외했다.
- Database: Supabase 테이블, 필드, 관계, RLS, seed data만 담당하도록 정리했다. API/화면/Auth 로직 구현은 제외했다.
- AI&MLOps: 로컬 LLM 서버 운영, 프롬프트, JSON 형식, 품질 테스트, 장애 대응만 담당한다. 추천 저장/사용량 차감/API 구현은 Backend로 분리했다.

## 2. 누락된 핵심 로직

보완 필요:

- 회원가입 후 기본 row 생성: `profiles`, `creator_profiles`, `user_plans`
- 온보딩 저장 후 대시보드 진입 분기
- 찜 대상 타입 통일: `trend`, `product`, `recommendation`
- 추천 요청 저장: `recommendation_requests`
- 추천 결과 저장: `recommendations`
- 추천 사용량 차감 실패 방지: LLM/저장 성공 후에만 차감
- 로컬 LLM JSON 응답 검증
- 공통 에러 응답과 401/404 처리
- mock 기반 `trends/products/influencers/reels` seed data

## 3. MVP 제외 권장 기능

한 달 MVP에서 제외 또는 4순위:

- 실제 PG 결제 연동
- 결제 수단 등록/삭제의 실제 처리
- 실제 Instagram API 수집
- 관리자 페이지와 관리자 수정 정책
- 고급 로그/통계 대시보드
- 주문/결제 상태 저장 API 전체 구현
- OpenAI API 사용

## 4. 문서 간 API/테이블명 통일 결과

API 경로 통일:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/reset-password`
- `PATCH /api/auth/update-password`
- `GET /api/home`
- `GET /api/trends`
- `GET /api/products`
- `GET /api/favorites`
- `POST /api/favorites`
- `DELETE /api/favorites/:id`
- `GET /api/me`
- `PATCH /api/me/profile`
- `PATCH /api/me/password`
- `GET /api/me/addresses`
- `POST /api/me/addresses`
- `PATCH /api/me/addresses/:id`
- `DELETE /api/me/addresses/:id`
- `PATCH /api/me/addresses/:id/default`
- `GET /api/dashboard`
- `POST /api/onboarding`
- `POST /api/recommendations`
- `GET /api/recommendations`
- `GET /api/recommendations/:id`

테이블명 통일:

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

주의:

- 현재 `supabase/schema.sql`에는 `user_profiles`, `saved_recommendations`가 있으므로 MVP 테이블명과 불일치한다. Database 담당이 `profiles`, `favorites` 기준으로 정리해야 한다.
- 현재 코드에는 `/api/shop/products`가 없고 문서는 `/api/products`로 통일했다.

## 5. 한 달 구현 가능성 평가

가능한 부분:

- 회원가입/로그인/온보딩/대시보드 MVP
- mock/seed 기반 트렌드/상품/찜 조회
- 로컬 LLM 기반 추천 요청과 결과 저장
- 마이페이지 프로필/비밀번호/배송지 관리
- 기본 에러/404 처리

부족한 부분:

- Supabase schema가 현재 MVP 테이블과 많이 다르다.
- OpenAI 기반 코드가 남아 있어 로컬 LLM 전환이 필요하다.
- 프론트 페이지는 대부분 mock 기반이고 폼 제출 로직이 없다.
- 주문/결제는 한 달 MVP에서 실제 서비스 수준까지 어렵다.

판단:

- 바로 상용 서비스 가능: 아님
- 데모/MVP 서비스 가능: 가능
- 추가 보완 필요: 배포 안정성, 인증 보안, RLS 검증, LLM 장애 대응

## 6. 최종 구현 우선순위

1순위:

- DB: `profiles`, `creator_profiles`, `user_plans`, `trends`, `products`, `favorites`
- Backend: auth, me, onboarding, dashboard
- Frontend: 메인, 로그인, 회원가입, 온보딩, 대시보드
- AI&MLOps: 로컬 LLM health/API 호출 확인

2순위:

- DB: `influencers`, `reels`, `recommendation_requests`, `recommendations`, `addresses`
- Backend: favorites, addresses, recommendations
- Frontend: 추천 페이지, 트렌드, 상품, 찜, 마이페이지 핵심
- AI&MLOps: 프롬프트/JSON 품질 테스트

3순위:

- DB: `service_contents`, `sample_recommendations`, `error_logs`, `not_found_logs`
- Backend: home, error logs, 404 logs
- Frontend: 에러/404 보강, 로딩/빈 상태 정리
- AI&MLOps: 장애 대응 문서화

4순위:

- `orders`, `payments`, 결제 화면, 결제 완료 화면, 결제 수단 관리는 상태 저장 또는 UI placeholder 수준

## 7. 서비스 가능 여부 결론

결론: **데모/MVP 서비스 가능**

한 달 안에 가능한 현실적 목표는 “회원가입 -> 온보딩 -> 대시보드 -> 트렌드/상품 탐색 -> 찜 -> 로컬 LLM 추천 생성 -> 추천 결과 조회” 흐름이다. 실제 결제, 실제 Instagram 수집, 관리자 운영 기능은 MVP 이후로 미루는 것이 맞다.
