# Release Checklist

## 배포 전 체크리스트

- [ ] PR이 모두 merge되었다.
- [ ] `develop`에서 주요 기능 확인이 끝났다.
- [ ] release branch 또는 tag 전략이 확정되었다.

## 환경변수 확인

- [ ] Supabase URL이 등록되었다.
- [ ] Supabase anon key가 등록되었다.
- [ ] AI provider/model 설정이 등록되었다.
- [ ] FastAPI base URL이 등록되었다.

## 빌드 확인

- [ ] Next.js build가 통과했다.
- [ ] FastAPI app import check가 통과했다.
- [ ] 배포 로그에 critical error가 없다.

## 주요 페이지 확인

- [ ] 랜딩 페이지
- [ ] 온보딩 페이지
- [ ] 대시보드
- [ ] 트렌드 페이지
- [ ] 추천 페이지
- [ ] 저장 페이지
- [ ] 관리자 페이지

## API health check 확인

- [ ] Next.js `GET /api/health`
- [ ] FastAPI `GET /health`
