# Be Celeb QA Report

기준일: 2026-05-14

## 범위

Be Celeb 웹 앱과 FastAPI 앱을 YouTube 전용 서비스 기준으로 점검했다. 실제 외부 API 키와 Supabase 환경변수가 없는 로컬 환경에서는 입력 검증, 인증 실패, 환경변수 누락 응답, 빈 데이터 화면, 빌드 안정성을 중심으로 확인했다.

## 테스트한 페이지

- `/`
- `/dashboard`
- `/trends`
- `/recommendations`
- `/login`
- `/signup`
- `/profile`
- `/saved`
- `/admin`
- `/not-real-page`
- 모바일 폭 QA: `/dashboard`, `/trends`

## 테스트한 API

- `GET /api/health`
- `POST /api/analyze-channel`
- `POST /api/recommend-content`
- `GET /api/recommendations`
- `GET /api/trends`
- `GET /api/trends/keywords`
- `GET /api/trends/popular-videos`
- `POST /api/recommend-options`
- `POST /api/generate-content-plan`
- `POST /api/cron/collect-daily-videos`
- `POST /api/collect-daily-videos`
- `POST /api/ai/recommend`
- `POST /api/email/test`
- `GET /api/me`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/reset-password`
- `GET /api/not-a-real-route`

## 발견한 문제

- 루트에서 `npm run dev`가 실패했다. 루트 `package.json`에 `dev` 스크립트가 없었다.
- 과거 추천/트렌드/저장/상세 화면이 운영 DB가 아닌 정적 샘플 데이터에 의존했다.
- 일부 레거시 API가 운영 기능처럼 보이지만 실제 추천/트렌드 데이터와 연결되지 않았다.
- `POST /api/email/test`가 공개 호출 가능한 테스트 엔드포인트였다.
- cron 수집 엔드포인트에서 `CRON_SECRET` 미설정 시 서버 오류처럼 보일 수 있었다.
- 모바일 헤더 내비게이션이 작은 화면에서 기본 위치 기준으로 마지막 항목이 잘려 보였다.
- FastAPI 앱 설명과 일부 라우트가 샘플 전용 구조를 유지했다.
- 프로젝트 내 타 플랫폼 관련 문구가 YouTube 전용 서비스 방향과 맞지 않았다.

## 수정한 문제

- 루트 `package.json`에 `dev`, `build`, `lint`, `typecheck` 스크립트를 추가했다.
- 정적 샘플 기반 추천/트렌드/저장/상세 화면을 제거하고 실제 API 또는 빈 상태 안내로 바꿨다.
- `/api/recommendations`, `/api/trends`는 레거시 목록 API로 명확히 응답하고 실제 조회 API를 안내하도록 정리했다.
- `/api/ai/recommend`, `/api/email/test` 응답 형식을 공통 JSON 패턴으로 맞췄다.
- `/api/email/test`, `/api/cron/collect-daily-videos`, `/api/collect-daily-videos`는 `CRON_SECRET` 기반 보호를 확인했다.
- `CRON_SECRET`이 없거나 틀린 cron 요청은 `401`을 반환한다.
- 모바일 헤더 로고 줄바꿈과 내비게이션 잘림을 개선했다.
- 프로필 화면은 실제 `/api/me`와 `/api/me/profile` 기반으로 동작하고, 미로그인 상태는 빈 상태로 안내한다.
- admin 화면은 운영용 YouTube 수집 설정 체크리스트로 바꿨다.
- FastAPI의 샘플 전용 라우트와 저장소, 서비스 코드를 제거하거나 빈 응답 구조로 정리했다.
- YouTube 전용 서비스와 맞지 않는 타 플랫폼 잔여 문구를 제거했다.

## 삭제한 기능과 코드

- 웹 샘플 데이터 파일
  - `apps/web/src/mocks/mockRecommendations.ts`
  - `apps/web/src/mocks/mockTrends.ts`
  - `apps/web/src/mocks/mockUserProfile.ts`
- 샘플 데이터만 소비하던 웹 컴포넌트와 feature 서비스
  - `apps/web/src/components/recommendation/RecommendationActions.tsx`
  - `apps/web/src/components/recommendation/RecommendationCard.tsx`
  - `apps/web/src/components/recommendation/RecommendationDetail.tsx`
  - `apps/web/src/components/recommendation/RecommendationList.tsx`
  - `apps/web/src/components/trend/TrendCard.tsx`
  - `apps/web/src/components/trend/TrendList.tsx`
  - `apps/web/src/features/*`
- FastAPI 샘플 전용 분석/추천/트렌드 코드
  - `apps/api/app/api/routes/analysis.py`
  - `apps/api/app/schemas/analysis.py`
  - `apps/api/app/services/ai_recommendation_service.py`
  - `apps/api/app/services/trend_analysis_service.py`
  - `apps/api/app/repositories/*`
  - `apps/api/app/mocks/*`

## 아직 수동 설정이 필요한 부분

- Supabase 프로젝트에 최신 migration 적용
- `creator_categories` 기본 카테고리 seed 적용
- `influencer_channels`에 카테고리별 YouTube 채널 URL 입력
- Render 또는 GitHub Actions에 `CRON_SECRET`과 수집 URL secret 등록
- YouTube Data API 키 발급 및 서버 환경변수 등록
- LLM API 키와 URL 등록
- Resend 이메일 테스트가 필요하면 Resend 키 등록

## 필요한 환경변수

웹 앱 필수:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `YOUTUBE_API_KEY`
- `LOCAL_LLM_API_URL`
- `LOCAL_LLM_API_KEY`
- `LOCAL_LLM_MODEL`
- `CRON_SECRET`

선택 기능:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

배포와 DB 관리:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ACCESS_TOKEN`
- `DAILY_COLLECT_ENDPOINT`

## 실행 방법

```bash
npm install
npm run dev
npm run build
npm run lint
npm run typecheck
```

FastAPI 로컬 실행:

```bash
npm run dev:api
```

## 수동 API 테스트

cron 수집 테스트:

```bash
curl -X POST "$DAILY_COLLECT_ENDPOINT" \
  -H "Authorization: Bearer $CRON_SECRET"
```

추천 입력 검증 테스트:

```bash
curl -X POST "http://localhost:3000/api/recommend-content" \
  -H "Content-Type: application/json" \
  -d '{"channelUrl":"https://www.youtube.com/@channel","category":"IT"}'
```

## 배포 전 체크리스트

- Supabase migration과 seed를 적용한다.
- `.env.example` 값을 기준으로 운영 환경변수를 설정한다.
- `YOUTUBE_API_KEY`, `LOCAL_LLM_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`가 클라이언트에 노출되지 않는지 확인한다.
- Render Cron Job 또는 GitHub Actions schedule을 `0 21 * * *`로 설정한다. 이는 KST 매일 오전 6시에 해당한다.
- `POST /api/cron/collect-daily-videos`가 secret 없이는 `401`, secret이 맞으면 collector 실행 경로로 들어가는지 확인한다.
- `/dashboard`에서 실제 YouTube 채널 URL로 추천 생성 플로우를 확인한다.
- `/trends`에서 DB가 비어 있을 때 빈 상태가 깨지지 않는지 확인한다.
- `/profile`에서 로그인, 프로필 수정, 로그아웃을 확인한다.

## 최종 검증 결과

- `npm run lint`: 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과
- `python -m compileall app` in `apps/api`: 통과
- `npm test`: 루트 `package.json`에 `test` 스크립트가 없어 실행하지 않음

API 스모크 테스트 요약:

- `GET /api/health`: `200`
- 잘못된 추천/분석 입력: `400`
- secret 없는 cron/email test 호출: `401`
- secret이 맞는 cron 호출: collector 경로 진입 후 로컬 Supabase 환경변수 누락으로 `502`
- Supabase 환경변수가 필요한 트렌드 API: 로컬 env 누락을 명확한 JSON `500`으로 반환
- 존재하지 않는 API: `404`
