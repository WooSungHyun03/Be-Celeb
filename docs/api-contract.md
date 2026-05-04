# API Contract

현재 API는 배포 가능한 최소 연결 구조를 제공합니다. OpenAI/Resend/Supabase secret은 서버 환경변수에서만 읽습니다.

## Next.js API Route 초안

### `GET /api/health`

```json
{
  "status": "ok",
  "service": "be-celeb-web"
}
```

### `GET /api/trends`

```json
{
  "success": true,
  "data": [
    {
      "id": "trend-001",
      "title": "AI voice-over daily vlog",
      "category": "ai-video",
      "platforms": ["tiktok", "youtube-shorts"],
      "score": 87
    }
  ]
}
```

### `GET /api/recommendations`

```json
{
  "success": true,
  "data": [
    {
      "id": "rec-001",
      "title": "AI narration behind-the-scenes short",
      "category": "ai-video",
      "priority": "high"
    }
  ]
}
```

### `POST /api/ai/recommend`

Request:

```json
{
  "userProfile": {
    "primaryCategory": "ai-video",
    "platforms": ["tiktok"]
  },
  "trendData": [],
  "ruleBasedResult": {
    "score": 82
  }
}
```

Response:

```json
{
  "recommendation": {
    "title": "추천 콘텐츠 제목",
    "reason": "추천 이유",
    "hookText": "첫 3초 훅",
    "contentPlan": ["장면 1", "장면 2", "장면 3"],
    "hashtags": ["#릴스", "#틱톡", "#추천"],
    "uploadTime": "오늘 오후 8시",
    "difficulty": "보통",
    "expectedScore": 87
  },
  "model": "gpt-5.4-mini"
}
```

### `POST /api/email/test`

Request:

```json
{
  "to": "your-email@example.com",
  "subject": "Be Celeb email test"
}
```

Response:

```json
{
  "status": "sent",
  "data": {
    "id": "resend-email-id"
  }
}
```

## FastAPI API Endpoint 초안

### `GET /health`

FastAPI 서버 상태를 반환합니다.

```json
{
  "status": "ok",
  "service": "be-celeb-api"
}
```

### `GET /trends`

mock trend list를 반환합니다.

### `GET /recommendations`

mock recommendation list를 반환합니다.

### `POST /recommendations/generate`

Request:

```json
{
  "userProfile": {
    "primaryCategory": "ai-video",
    "platforms": ["tiktok"]
  },
  "trendData": []
}
```

Response:

```json
{
  "success": true,
  "data": {
    "recommendation": {
      "title": "추천 콘텐츠 제목",
      "reason": "추천 이유",
      "hookText": "첫 3초 훅",
      "contentPlan": ["장면 1", "장면 2", "장면 3"],
      "hashtags": ["#릴스", "#틱톡", "#추천"],
      "uploadTime": "오늘 오후 8시",
      "difficulty": "보통",
      "expectedScore": 87
    },
    "ruleBasedResult": {
      "score": 70,
      "category_fit": 30,
      "platform_fit": 30,
      "notes": []
    },
    "model": "gpt-5.4-mini"
  }
}
```
