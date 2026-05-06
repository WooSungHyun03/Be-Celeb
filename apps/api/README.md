# Be Celeb FastAPI

Be Celeb의 AI/Data Analysis 서버입니다. Render 배포를 기준으로 FastAPI, OpenAI API, Supabase REST helper, Resend helper 구조를 제공합니다.

## 실행 방법

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Endpoint

- `GET /health`
- `GET /trends`
- `GET /recommendations`
- `POST /recommendations/generate`
- `POST /analysis`

## 구현 원칙

- Route는 HTTP 입출력만 담당합니다.
- Service는 추천/분석 로직을 담당합니다.
- Schema는 request/response 타입을 담당합니다.
- Repository는 추후 Supabase 또는 다른 저장소 접근을 담당합니다.
- `/recommendations/generate`는 `OPENAI_API_KEY` 설정 시 실제 OpenAI API를 호출합니다.
- `/health`는 Render health check에 사용합니다.
