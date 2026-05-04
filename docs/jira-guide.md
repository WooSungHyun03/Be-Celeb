# Jira Guide

## Epic 구성

- `BC-SETUP`: 프로젝트 초기 설정
- `BC-FE`: 프론트엔드 화면 및 UI
- `BC-BE`: API, Supabase, FastAPI
- `BC-DATA`: 카테고리, 룰베이스, mock data
- `BC-DEPLOY`: 배포, 환경변수, 운영 준비

## Story/Task 작성법

권장 제목:

```txt
[역할] 작업 요약
```

예시:

- `[FE] 트렌드 목록 페이지 mock UI 구성`
- `[BE] FastAPI analysis endpoint skeleton 작성`
- `[DATA] 룰베이스 추천 규칙 JSON 초안 작성`
- `[LEAD] Vercel 배포 환경변수 문서화`

## 티켓 상태값

- `Backlog`: 아직 시작하지 않은 작업
- `Ready`: 이번 스프린트에서 착수 가능한 작업
- `In Progress`: 작업 중
- `In Review`: PR 리뷰 중
- `Done`: 완료 기준 충족

## 완료 조건

- 담당 디렉터리 변경 범위가 명확합니다.
- mock 또는 TODO 위치가 명확합니다.
- 관련 README/docs가 갱신되었습니다.
- 실행 또는 확인 방법이 PR에 포함되었습니다.
