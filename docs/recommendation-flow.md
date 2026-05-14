# Recommendation Flow

## 현재 추천 흐름

Be-Celeb dashboard 추천은 1회 LLM 호출 구조다.

```text
Dashboard
→ POST /api/recommend-content
→ YouTube channel 분석
→ 회원별 channelUrl/category 저장
→ category influencer_videos 조회
→ active LLM prompt 적용
→ title/hashtags/thumbnail/hook/storyboard/uploadTips 반환
```

이전 2단계 흐름인 `recommend-options`와 `generate-content-plan`은 dashboard에서 사용하지 않는다.

## 회원별 채널 설정

테이블: `user_channel_settings`

- `user_id`
- `channel_url`
- `category`
- `youtube_channel_id`
- `channel_title`
- `channel_thumbnail_url`

Dashboard 진입 시 `GET /api/user/channel-settings`로 저장값을 불러온다.
추천 요청 또는 계정 설정 저장 시 `PUT /api/user/channel-settings`로 최신 channel URL/category를 저장한다.

## LLM Prompt 관리

테이블: `llm_prompt_templates`

Admin `/admin`의 `LLM Prompts` 섹션에서 다음 작업을 한다.

- prompt 목록 조회
- prompt 생성/수정/삭제
- type별 active prompt 지정
- prompt preview 확인

추천 API는 active prompt를 우선 사용하고, active prompt가 없으면 backend fallback prompt를 사용한다.

## 회원 탈퇴

회원 탈퇴는 `DELETE /api/account`를 호출한다.

- Supabase access token으로 현재 사용자 확인
- `user_channel_settings` 삭제
- `user_channel_analyses`, `content_recommendations`의 `user_id`는 null 처리
- Supabase Auth admin delete user 실행
- frontend session signOut 후 홈으로 이동
