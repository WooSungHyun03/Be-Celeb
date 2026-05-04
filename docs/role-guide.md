# Role Guide

## 팀장 역할

- 전체 프로젝트 구조 관리
- GitHub branch, PR, release 관리
- Jira ticket과 sprint 일정 관리
- Vercel 배포 준비
- Supabase 프로젝트 관리
- FastAPI 서버 배포 준비
- 환경변수와 secret 관리

담당 디렉터리:

- 루트 설정 파일
- `README.md`
- `docs/`
- `project-management/`
- `supabase/`
- `.github/`
- `apps/web/next.config.ts`
- `apps/api/app/core/config.py`

## 프론트엔드 역할

- Next.js App Router 페이지 개발
- 랜딩, 온보딩, 대시보드, 트렌드, 추천, 저장 페이지 개발
- 공통 UI 컴포넌트 개발
- mock data 기반 화면 구성

담당 디렉터리:

- `apps/web/src/app`
- `apps/web/src/components`
- `apps/web/src/features`
- `apps/web/src/constants`
- `apps/web/src/mocks`
- `apps/web/src/utils`
- `apps/web/src/types`
- `apps/web/public`

## 백엔드 역할

- Next.js Route Handler
- Supabase client 구조
- FastAPI route-service-schema 구조
- 추천 로직 service 계층
- AI API 연동 준비
- Auth/DB 연동 준비

담당 디렉터리:

- `apps/web/src/app/api`
- `apps/web/src/lib/supabase`
- `apps/web/src/lib/openai`
- `apps/web/src/lib/resend`
- `apps/api/app`

## 데이터/디자인 관리 역할

- 트렌드 카테고리 정의
- 룰베이스 추천 규칙 관리
- mock trend/user/recommendation data 관리
- 디자인 토큰과 서비스 문구 관리
- 발표/데모용 시나리오 관리

담당 디렉터리:

- `data-design/`
- `apps/web/src/mocks`
- `apps/web/src/constants`
- `apps/api/app/mocks`
- `packages/shared/constants`
