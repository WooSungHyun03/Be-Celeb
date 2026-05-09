# 프론트엔드 구현 가이드

> 현재 구조: `apps/web`는 Next.js App Router 기반이다. 화면은 `apps/web/src/app`, UI는 `apps/web/src/components`, 도메인 service/type은 `apps/web/src/features`, 공통 타입은 `apps/web/src/types`에 둔다. 프론트엔드는 화면, 폼, 라우팅, API 호출 연결, UI 상태만 담당한다.

## 1. 담당 범위

포함:

- 페이지 UI 구현
- App Router 라우팅 구성
- 폼 입력/검증
- `features/*/*.service.ts` 또는 `lib/api` 기반 API 호출 연결
- 로딩/에러/빈 상태
- 인증 상태별 화면 분기
- 찜/삭제/추천 요청 등 사용자 인터랙션
- 모바일 반응형 UI

제외:

- 백엔드 API 구현
- Supabase 테이블/RLS/seed 작성
- LLM 직접 호출
- 실제 PG 결제 처리
- 서버 배포 설정
- 로컬 LLM 서버 운영

## 2. 현재 코드 스타일

- 페이지는 `app/**/page.tsx` 서버 컴포넌트가 기본이다.
- 인터랙션이 필요한 컴포넌트만 `"use client"`와 `useState`를 사용한다.
- 공통 컴포넌트는 `Button`, `Input`, `Card`, `Badge`, `Loading`, `EmptyState`, `ErrorState`, `Toast`를 우선 재사용한다.
- 도메인 컴포넌트는 `components/trend`, `components/recommendation`, `components/onboarding`처럼 분리한다.
- Tailwind 직접 스타일링을 사용하고 `ink`, `slate`, `violet`, `brand`, `signal` 색상 패턴을 유지한다.
- 현재 mock import가 페이지에 남아 있으므로 실제 연동 시 service 함수로 이동한다.
- shadcn/ui는 현재 사용하지 않는다. 새 UI 라이브러리 추가는 MVP 이후 검토한다.

## 3. API 경로 기준

프론트엔드가 호출할 백엔드 API는 아래 이름으로 통일한다.

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

## 4. 구현 우선순위

1순위:

- 메인 페이지
- 로그인/회원가입
- 온보딩 입력
- 대시보드

2순위:

- 콘텐츠 추천 페이지
- 트렌드 페이지
- 마이페이지 회원정보
- 비밀번호 변경

3순위:

- 상점 페이지
- 찜 페이지
- 요금 페이지
- 배송지 관리

4순위:

- 결제 화면, 결제 완료 화면, 결제 수단 관리는 UI placeholder만
- 회원탈퇴
- 에러/404 페이지 보강

## 5. 페이지별 구현 가이드

| 페이지 | 목적 | 주요 UI | 호출 API | 상태 처리 | 완료 기준 |
| --- | --- | --- | --- | --- | --- |
| 메인 `/` | 서비스 진입 | 소개, 기능, 추천 샘플, 트렌드 요약, CTA | `GET /api/home` | loading/error/empty | mock import 제거 |
| 로그인 `/login` | 인증 | 이메일/비밀번호, 찾기 링크, 실패 메시지 | `POST /api/auth/login` | submitting/error | 성공 시 `/dashboard` |
| 아이디 찾기 `추가 필요` | 계정 안내 | 이메일 입력, 안내 메시지 | 백엔드 확정 후 | success/error | 개인정보 과노출 없음 |
| 비밀번호 찾기 `추가 필요` | 재설정 메일 | 이메일 입력, 완료 메시지 | `POST /api/auth/reset-password` | submitting/success/error | 가입 여부 노출 없음 |
| 회원가입 `/signup` | 계정 생성 | 이메일, 비밀번호, 확인, 닉네임, 약관 | `POST /api/auth/signup` | validation/submitting | 성공 후 온보딩 |
| 온보딩 `/onboarding` | 초기정보 저장 | 경력, 카테고리, 팔로워, 주기, 목표, 스타일 | `POST /api/onboarding` | step validation | 저장 후 대시보드 |
| 대시보드 `/dashboard` | 개인 요약 | 프로필, 맞춤 추천, 유사 인플루언서, 최근 추천, 사용량 | `GET /api/dashboard` | loading/error/empty | 온보딩 미완료 분기 |
| 추천 `/recommendations` | 추천 생성/조회 | 요청 폼, 생성 버튼, 결과 카드, 찜 | `POST/GET /api/recommendations` | generating/error/empty | LLM 직접 호출 없음 |
| 추천 상세 `/recommendations/[id]` | 결과 상세 | 추천 구성, 해시태그, 저장/복사 | `GET /api/recommendations/:id` | loading/error | 상세 표시 |
| 트렌드 `/trends` | 트렌드 탐색 | 카드, 카테고리 필터, 찜 | `GET /api/trends`, favorites API | loading/error/empty | 필터/찜 UI |
| 상품 `추가 필요` | 상품 탐색 | 상품 카드, 카테고리, 검색, 구매 링크 | `GET /api/products` | loading/error/empty | 목록 조회 |
| 찜 `/saved` 개선 | 저장 목록 | 타입 필터, 삭제, 빈 상태 | favorites API | loading/error/empty | 상품/트렌드/추천 통합 |
| 요금 `/pricing` | 플랜 안내 | Free/Creator/Pro 카드, 현재 플랜 | `GET /api/me` | 로그인 분기 | 변경 버튼은 요청만 |
| 마이페이지 `/profile` | 계정 허브 | 계정 요약, 플랜, 메뉴 | `GET /api/me` | auth/loading/error | 하위 메뉴 이동 |
| 회원정보 `추가 필요` | 프로필 수정 | 닉네임, 인스타 ID | `PATCH /api/me/profile` | validation/submitting | 저장 후 반영 |
| 비밀번호 변경 `추가 필요` | 비밀번호 변경 | 현재/새/확인 | `PATCH /api/me/password` | validation/error | 완료 메시지 |
| 배송지 `추가 필요` | 배송지 관리 | 목록, 추가/수정, 기본 설정, 삭제 | addresses API | empty/confirm | 기본 배송지 표시 |
| 회원탈퇴 `추가 필요` | 위험 작업 | 주의 문구, 확인 모달 | 백엔드 확정 후 | confirm/error | 로그아웃 흐름 |
| 에러 페이지 `추가 필요` | 장애 안내 | 메시지, 이전/메인 이동 | 없음 | reset 가능 | 친화적 문구 |
| 404 `not-found.tsx` | 잘못된 URL | 메인/대시보드 이동 | 없음 | 정적 | 이동 버튼 |

## 6. 공통 컴포넌트 기준

이미 있음:

- `Button`
- `Input`
- `Card`
- `Badge`
- `Loading`
- `EmptyState`
- `ErrorState`
- `Toast`
- `TrendCard`
- `RecommendationCard`
- `RecommendationList`

추가 필요:

- `PageHeader`
- `ConfirmModal`
- `CategoryFilter`
- `FavoriteButton`
- `ProductCard`
- `InfluencerCard`
- `PlanCard`
- `AddressForm`
- `OrderSummaryCard`는 4순위

분리 기준:

- 2개 이상 페이지에서 반복되면 공통 컴포넌트로 분리
- 특정 도메인 전용이면 `components/{domain}`에 배치
- 기존 `Card`, `Button`, `Badge` 스타일을 우선 유지

## 7. 상태/UX 기준

- 모든 데이터 화면: `loading`, `error`, `empty`, `success`
- 모든 폼: 입력값, 유효성 검사, 제출 중, 성공/실패 메시지
- 버튼 클릭 후 중복 제출 방지
- 찜/삭제는 성공 시 즉시 UI 반영, 실패 시 원복
- 삭제/탈퇴 등 위험 행동은 확인 모달 사용
- 401 응답은 로그인 이동 또는 로그인 필요 안내
- 모바일에서 `grid`, `flex-col`, `sm/md/lg` 반응형 유지

## 8. 체크리스트

- [ ] 기존 mock 직접 import를 service 함수로 이동
- [ ] API 호출 함수 도메인별 정리
- [ ] 로그인/회원가입 폼 검증 연결
- [ ] 온보딩 저장 연결
- [ ] 대시보드 API 연결
- [ ] 추천 요청/결과/찜 UI 연결
- [ ] 트렌드/상품/찜 목록 연결
- [ ] 마이페이지/프로필/비밀번호/배송지 UI 연결
- [ ] 로딩/에러/빈 상태 전체 적용
- [ ] LLM 직접 호출 코드가 없는지 확인
