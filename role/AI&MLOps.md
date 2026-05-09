# AI & MLOps 구현 가이드

> 현재 AI 추천 코드는 OpenAI 기준 흔적이 남아 있다. MVP 기준 AI & MLOps 담당자는 OpenAI를 사용하지 않고, 로컬 llama.cpp 서버를 OpenAI 호환 Chat Completions API로 안정 운영한다. 추천 결과 저장, 사용량 차감, API 구현은 Backend 담당이다.

## 1. 담당 범위

포함:

- 로컬 LLM 서버 실행 환경 구성
- Docker 기반 llama.cpp server 실행
- RTX 3090 GPU 2장 사용 설정
- GGUF 모델 로딩
- Cloudflare Tunnel 연결
- OpenAI 호환 API 동작 확인
- 추천 시스템 프롬프트 설계
- JSON 응답 형식 설계
- LLM 응답 품질 테스트
- 장애 대응 기준 정리
- Backend 담당자에게 LLM API 스펙 전달

제외:

- 프론트엔드 화면 구현
- 백엔드 API 구현
- DB 테이블 설계
- Supabase 연동
- 추천 결과 저장
- 추천 사용량 차감
- 결제 기능
- 실제 Instagram API 수집
- OpenAI API 사용

## 2. 전체 연동 구조

```txt
Vercel Frontend
-> Backend API (/api/recommendations)
-> Local LLM API via Cloudflare Tunnel
-> llama.cpp Server
-> GGUF Model Inference
```

보안 원칙:

- 프론트엔드에서 LLM API 직접 호출 금지
- Backend 서버에서만 LLM API 호출
- API Key 또는 Cloudflare Access 적용 권장
- Tunnel 주소와 key는 클라이언트에 노출 금지

## 3. 로컬 LLM 서버 기준

현재 저장소에는 Dockerfile/compose/운영 스크립트가 없다. 아래 명령은 서버 환경 확인 후 확정한다.

환경:

- Local Server
- RTX 3090 GPU 2장
- Docker + NVIDIA Container Toolkit
- llama.cpp server
- 모델: `Qwen3.5-35B-A3B-Claude-4.6-Opus-Reasoning-Distilled.Q6_K.gguf`
- 외부 API: `https://llm-api.be-celeb.org/v1/chat/completions`
- 내부 포트 예시: `8080`

실행 예시:

```bash
docker run -d --name be-celeb-llm \
  --gpus all \
  -p 8080:8080 \
  -v /models:/models \
  ghcr.io/ggerganov/llama.cpp:server-cuda \
  -m /models/Qwen3.5-35B-A3B-Claude-4.6-Opus-Reasoning-Distilled.Q6_K.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 8192 \
  --batch-size 512 \
  --n-gpu-layers 999 \
  --split-mode layer \
  --tensor-split 1,1
```

운영 기본값:

- `temperature`: 0.7
- `top_p`: 0.9
- `max_tokens`: 1200
- `ctx-size`: 8192, OOM 시 4096
- `batch-size`: 512, OOM 시 256
- health check: `/health`, `/v1/models`

## 4. LLM API 스펙

- endpoint: `/v1/chat/completions`
- method: `POST`
- full URL: `https://llm-api.be-celeb.org/v1/chat/completions`
- format: OpenAI 호환 Chat Completions

Headers:

```http
Content-Type: application/json
Authorization: Bearer <LOCAL_LLM_API_KEY>
```

Request:

```json
{
  "model": "be-celeb-local-qwen",
  "messages": [
    { "role": "system", "content": "시스템 프롬프트" },
    { "role": "user", "content": "추천 입력 JSON" }
  ],
  "temperature": 0.7,
  "max_tokens": 1200
}
```

Response:

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "{\"creatorType\":\"...\",\"summary\":\"...\",\"recommendations\":[]}"
      }
    }
  ]
}
```

## 5. 추천 프롬프트 기준

입력 데이터:

- 사용자 콘텐츠 프로필
- 인스타 경력
- 카테고리
- 현재 팔로워 수
- 업로드 주기
- 콘텐츠 목표
- 선호 콘텐츠 스타일
- 유사 인플루언서 요약
- 최근 reels mock 분석 결과

시스템 프롬프트 핵심:

```txt
당신은 Be Celeb의 한국어 숏폼 콘텐츠 전략 추천 모델이다.
입력 데이터만 근거로 실행 가능한 릴스 아이디어를 3개 이상 추천한다.
응답은 JSON object 하나만 반환한다.
마크다운, 코드블록, 설명문, 접두사, 사과문을 출력하지 않는다.
위험하거나 선정적이거나 허위 성과를 보장하는 추천은 하지 않는다.
```

## 6. JSON 응답 형식

```json
{
  "creatorType": "성장 초기 패션 크리에이터",
  "summary": "주 2~3회 반복 가능한 정보형 릴스가 적합합니다.",
  "recommendations": [
    {
      "type": "오늘 바로 찍기 좋은 릴스",
      "topic": "대학생 꾸안꾸 코디 3가지",
      "title": "꾸민 듯 안 꾸민 듯 입는 사람들의 공통점",
      "hook": "꾸안꾸인데 왜 나는 안 예뻐 보일까?",
      "structure": ["0~3초: 문제 상황 제시", "4~8초: 해결 코디 1", "9~13초: 해결 코디 2", "14~18초: 저장 유도"],
      "keywords": ["꾸안꾸", "대학생 코디"],
      "hashtags": ["#꾸안꾸", "#대학생코디", "#ootd"],
      "reason": "패션 카테고리와 성장 초기 팔로워 구간에 적합한 반복형 콘텐츠입니다.",
      "difficulty": "쉬움",
      "estimatedTime": "30분",
      "requiredItems": ["스마트폰", "삼각대"]
    }
  ]
}
```

검증 기준:

- JSON parse 가능
- `recommendations` 3개 이상
- `difficulty`: `쉬움`, `보통`, `어려움`
- `structure`, `keywords`, `hashtags`, `requiredItems`는 배열

## 7. 품질 테스트

테스트 케이스:

- 초보 패션 크리에이터
- 운동 카테고리 성장 계정
- 뷰티 카테고리 고팔로워 계정
- 얼굴 노출 불가 사용자
- 업로드 주기 낮은 사용자

확인 항목:

- 응답 시간
- JSON 파싱 가능
- 추천 3개 이상
- 사용자 카테고리/경력/팔로워/업로드 주기 반영
- 후킹 문장 구체성
- 해시태그 적절성
- 일반론/성과 보장 표현 방지

## 8. 운영/장애 대응

확인 명령:

```bash
docker ps
docker logs --tail 100 be-celeb-llm
docker stats be-celeb-llm
nvidia-smi
curl https://llm-api.be-celeb.org/health
curl https://llm-api.be-celeb.org/v1/models
cloudflared tunnel info be-celeb-llm
```

장애 대응:

- 응답 없음: 컨테이너 상태, 포트, tunnel 확인 후 재시작
- Tunnel 끊김: `cloudflared` 재시작, DNS 확인
- GPU OOM: `ctx-size`, `batch-size`, 동시 요청 수 축소
- JSON 깨짐: 시스템 프롬프트 강화, `max_tokens` 조정
- 응답 지연: 입력 축약, max_tokens 축소, 동시성 제한
- 모델 로딩 실패: 모델 경로, 파일 권한, VRAM 확인

## 9. 보안 기준

- LLM API 주소 프론트엔드 직접 노출 금지
- Backend 서버에서만 호출
- `LOCAL_LLM_API_KEY` 또는 Cloudflare Access 적용
- 로그에 이메일, 전화번호, 토큰, 불필요한 개인정보 저장 금지
- 프롬프트에는 추천에 필요한 최소 프로필만 포함

## 10. 체크리스트

- [ ] Docker 실행 명령 확정
- [ ] GPU 2장 사용 확인
- [ ] GGUF 모델 로딩 확인
- [ ] Cloudflare Tunnel 연결 확인
- [ ] `/v1/chat/completions` 호출 테스트
- [ ] `/health` 또는 `/v1/models` 확인
- [ ] 추천 시스템 프롬프트 초안 작성
- [ ] JSON 출력 형식 고정
- [ ] 테스트 케이스 5개 수행
- [ ] 장애 대응 절차 정리
- [ ] Backend 담당자에게 endpoint/header/request/response 전달
- [ ] OpenAI API 사용 금지 공유
