# Git Workflow

## 브랜치 전략

- `main`: 배포 가능한 안정 브랜치
- `develop`: 기능 통합 브랜치
- `feature/frontend-*`: 프론트엔드 기능 작업
- `feature/backend-*`: 백엔드/API 작업
- `feature/data-*`: 데이터/디자인 작업
- `fix/*`: 버그 수정
- `docs/*`: 문서 작업

## PR 규칙

- PR은 Jira ticket 단위로 생성합니다.
- PR 제목은 커밋 컨벤션과 비슷한 형식을 사용합니다.
- 변경 범위, 확인 방법, 관련 티켓을 PR 본문에 남깁니다.
- 환경변수 추가 시 `.env.example`과 README를 함께 갱신합니다.

## 코드 리뷰 규칙

- 역할별 담당 디렉터리 owner가 1명 이상 리뷰합니다.
- 기능 구현 위치에 TODO가 있으면 다음 담당자와 ticket을 명확히 적습니다.
- mock data와 실제 연동 코드가 섞이지 않도록 확인합니다.
- 리뷰 완료 전에는 `main`에 직접 merge하지 않습니다.
