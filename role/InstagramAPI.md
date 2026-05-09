> 검토 기준: 현재 저장소는 `apps/web` Next.js App Router, `apps/api` FastAPI, `supabase/schema.sql`, `supabase/policies.sql`, `supabase/seed.sql` 구조다. 역할 문서는 실제 Instagram API 수집을 MVP 범위에서 제외하고, mock/seed 기반 추천 흐름을 먼저 완성하는 방향으로 정리되어 있다.

# 1. 전체 적용 가능성 판단

최종 판단: **적합하지만 일부 수정 필요**

이 방법론은 Be Celeb의 장기 목표와 잘 맞는다. 사용자가 입력한 카테고리/키워드/해시태그를 기준으로 유사 인플루언서와 최근 Reels 패턴을 분석하는 서비스라면, 실제 Instagram Professional 계정과 미디어 데이터를 수집해 `influencers`/`reels` 계열 DB를 채우는 구조가 가장 자연스럽다.

다만 한 달 MVP의 첫 구현 범위에는 과하다. 현재 프로젝트는 아직 mock import, OpenAI 흔적, FastAPI mock route, 미완성 Supabase schema가 남아 있다. 따라서 Instagram API 수집을 바로 핵심 기능으로 넣기보다, **동일한 DB 구조와 scoring 로직을 mock/seed data로 먼저 완성한 뒤 Phase 2에서 API를 붙이는 방식**이 안전하다.

공식 Instagram Graph API 제약:

- Meta Developer App, Professional Instagram 계정, 권한 승인, access token 운영이 필요하다.
- Business Discovery는 주로 공개 Business/Creator 계정에 한정된다. personal/private 계정은 조회가 안 될 수 있다.
- Hashtag Recent Media는 public media 후보를 주지만, username/owner를 안정적으로 제공하지 않는 제약이 있다. 즉 `hashtag -> media -> username 자동 추출`은 공식 API만으로 막힐 가능성이 높다.
- third-party 계정의 `views`, `saves`, 상세 insights는 제한될 수 있다. MVP에서는 `like_count`, `comments_count`, `media_type`, `caption`, `permalink` 중심으로 설계해야 한다.
- 대량 수집은 rate limit, app review, 정책 리스크가 크다. cron job은 소량, 캐시, retry, backoff 기준으로 설계한다.

바로 구현 가능한 부분:

- seed hashtag 테이블 설계
- mock influencer/reels 데이터 저장
- KoreanScore/CategoryScore rule-based 계산
- 추천 API에서 DB 기반 유사 인플루언서/릴스 조회
- 로컬 LLM 호출 프롬프트에 실제 DB와 동일한 shape 전달

추후 구현해야 할 부분:

- Instagram API 권한 승인
- hashtag id 조회와 recent media 테스트
- username 확보 전략 확정
- Business Discovery 기반 계정 보강
- Render Cron 또는 FastAPI internal job 자동화
- 관리자 후보 승인/거절 UI

참고 링크:

- Meta Instagram Platform: https://developers.facebook.com/docs/instagram-platform/
- Hashtag Search: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag-search/
- Hashtag Recent Media: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/recent-media/
- Business Discovery: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery/

# 2. 현재 역할별 구현 방향과의 적합성 분석

## 2-1. AI/MLOps 관점

적합하다.

- KoreanScore/CategoryScore는 AI/MLOps가 설계할 수 있지만, 실제 API 구현과 DB 저장은 Backend/Database 담당이다.
- 전체 계정에 LLM을 쓰면 비용, 지연, 운영 리스크가 커진다. MVP는 rule-based 우선, 애매한 후보만 LLM fallback이 적절하다.
- KoreanScore는 한글 비율, 한국어 해시태그, 한국 지역/문화 키워드로 계산한다.
- CategoryScore는 발견 seed hashtag, caption keyword, bio keyword를 우선 사용하고, top category confidence가 낮을 때만 로컬 LLM에 보조 분류를 요청한다.
- threshold는 코드에 하드코딩하지 말고 `data-design/rule-base.json` 또는 별도 config로 version 관리한다.
- AI/MLOps 담당은 프롬프트, JSON 응답 형식, threshold 튜닝 기준, 테스트셋, 품질 평가표를 관리한다.

권장 fallback 조건:

- `0.4 <= korean_score < 0.6`
- category 1위와 2위 점수 차이가 `0.15` 미만
- bio/caption 데이터가 너무 적어 rule-based 판정이 불안정한 경우
- seed hashtag와 bio/caption category가 충돌하는 경우

## 2-2. Frontend 관점

MVP 사용자 추천 UI와 충돌하지 않는다.

현재 프론트엔드는 `apps/web/src/app/recommendations`, `dashboard`, `trends`, `admin` 초안이 있고 mock 데이터를 직접 import하는 상태다. Instagram 수집 기능은 사용자 추천 화면과 분리해야 한다.

MVP 최소 범위:

- 추천 입력 페이지
- 추천 결과 페이지
- 카테고리별 인플루언서 목록 조회 페이지 또는 섹션

Phase 3 관리자 범위:

- `/admin/influencers`
- `/admin/candidates`
- `/admin/collection-logs`
- `/admin/seed-hashtags`

주의:

- 프론트엔드에서 Instagram API를 직접 호출하지 않는다.
- 프론트엔드는 수집 job 실행, 후보 승인/거절, 로그 조회 API를 호출하는 UI만 담당한다.
- 현재 `/admin/page.tsx`는 mock dashboard 초안이므로 Phase 3에서 도메인별 하위 페이지로 분리한다.

## 2-3. Backend 관점

Instagram API 호출은 반드시 백엔드에서 처리해야 한다.

이유:

- access token과 app secret을 브라우저에 노출하면 안 된다.
- rate limit, retry, backoff, logging은 서버에서 일관되게 처리해야 한다.
- Supabase service role key를 사용한 upsert는 서버 전용이다.
- 추천 API와 수집 API는 장애 범위가 다르므로 분리해야 한다.

현재 프로젝트 기준 권장 위치:

- 수집/분석 job: `apps/api` FastAPI
- 사용자-facing API: 문서 기준 `/api/*`
- Next Route Handler: 필요 시 FastAPI 프록시 또는 얇은 adapter

추가 환경변수:

- `INSTAGRAM_GRAPH_API_BASE_URL`
- `INSTAGRAM_GRAPH_API_VERSION`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_IG_USER_ID`
- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`
- `INTERNAL_JOB_SECRET`

## 2-4. Database 관점

현재 `role/Database.md`에는 `influencers`, `reels`, `recommendation_requests`, `recommendations`가 필요 테이블로 정의되어 있지만, 실제 `supabase/schema.sql`에는 아직 없다.

Instagram 수집을 붙이려면 아래 테이블이 필요하다.

- `category_seed_hashtags`
- `influencers`
- `influencer_reels`
- `influencer_candidates`
- `collection_logs`

명칭 충돌:

- 기존 문서에는 `reels`가 있다.
- Instagram 수집 전용 의미를 명확히 하려면 `influencer_reels`가 낫다.
- 한 달 MVP에서 문서 충돌을 줄이려면 `reels`를 확장해도 된다.
- 최종 권장: 실제 Instagram 수집 테이블은 `influencer_reels`, 기존 문서의 `reels`는 이 명칭으로 통일하는 방향을 팀 합의한다.

upsert 기준:

- `category_seed_hashtags`: unique `(category, hashtag)`
- `influencers`: unique `username`, 가능하면 unique `instagram_user_id`
- `influencer_reels`: unique `instagram_media_id`
- `influencer_candidates`: unique `username`
- `collection_logs`: unique 불필요, append-only

# 3. 권장 아키텍처 제안

전체 흐름:

```txt
Frontend
-> Backend API
-> Instagram Graph API
-> Supabase
-> Recommendation System
-> Local LLM API
-> Recommendation Result
```

수집 파이프라인:

```txt
Render Cron Job 또는 FastAPI internal endpoint
-> category_seed_hashtags 조회
-> Instagram Hashtag Search API 호출
-> Hashtag Recent Media API 호출
-> media/caption/hashtag 분석
-> username 확보 가능 여부 확인
-> Business Discovery API 호출
-> KoreanScore 계산
-> CategoryScore 계산
-> influencers 또는 influencer_candidates 저장
-> influencer_reels 저장
-> collection_logs 저장
```

중요 수정:

- 공식 API에서 hashtag media 결과만으로 username을 안정적으로 얻지 못할 수 있다.
- 따라서 Phase 2 초기에는 `category_seed_hashtags` 외에 수동 seed username 또는 후보 import가 필요하다.
- 자동 discovery가 막히면 `Business Discovery`는 “이미 알고 있는 username 보강” 용도로 사용한다.

추천 파이프라인:

```txt
사용자 입력/온보딩 정보
-> Supabase influencers/influencer_reels 조회
-> 카테고리/키워드/해시태그 유사도 계산
-> 최근 릴스 패턴 요약
-> 로컬 LLM API 호출
-> recommendation_requests 저장
-> recommendations 저장
-> 프론트엔드 응답
```

분리 원칙:

- 수집 API는 내부 관리자/cron 전용이다.
- 추천 API는 사용자-facing 기능이다.
- LLM은 추천 생성과 애매한 분류 fallback에만 사용한다.
- Instagram API 실패가 사용자 추천 API 전체 장애로 번지지 않게 DB에 저장된 최신 데이터를 사용한다.

# 4. 구현 우선순위

## Phase 1: MVP 안전 구현

목표:

- Instagram API 없이 seed/mock data로 동일한 DB 구조와 추천 흐름 구현
- KoreanScore, CategoryScore 로직을 mock data에 적용
- Supabase 저장 구조 완성

구현할 것:

- `influencers` 또는 `influencer_reels` schema 추가
- `category_seed_hashtags` seed data 추가
- mock influencer 20명, mock reels 50개
- `judge_korean_influencer()` 구현
- `classify_instagram_category()` 구현
- `/api/recommendations`가 DB 기반 추천 후보를 사용하도록 연결
- OpenAI 호출 흔적을 로컬 LLM client로 교체

## Phase 2: Instagram API 연동

목표:

- 공식 Instagram Graph API를 백엔드에서 호출
- hashtag 기반 media 후보 수집
- username 확보 가능한 데이터만 Business Discovery로 보강
- Supabase upsert 구현

구현할 것:

- `apps/api/app/services/instagram_service.py`
- `apps/api/app/jobs/collect_influencers_job.py`
- `collection_logs`
- retry/error handling
- 환경변수 구성
- dry-run mode

## Phase 3: 자동화 및 관리자 검수

목표:

- cron job 자동 실행
- 후보 인플루언서 검수 UI
- pending/approved/rejected 상태 관리

구현할 것:

- `/admin/influencers`
- `/admin/candidates`
- `/admin/collection-logs`
- `/admin/seed-hashtags`
- 후보 승인/거절 API
- 수집 상태 대시보드

## Phase 4: 추천 고도화

목표:

- 저장된 실제 인플루언서 DB를 추천시스템에 연결
- LLM 기반 콘텐츠 아이디어 생성 품질 향상

구현할 것:

- 유사도 알고리즘 개선
- 카테고리별 필터링
- engagement score 반영
- 최근 7일 릴스 분석
- 추천 결과 저장/조회 고도화

# 5. 필요한 DB schema 제안

현재 `supabase/schema.sql`에는 아래 Instagram 수집 테이블이 없다. 새로 추가 필요하다.

## `category_seed_hashtags`

목적: 카테고리별 수집 시작점 관리

| 컬럼 | 타입 | nullable | 기준 |
| --- | --- | --- | --- |
| `id` | uuid | no | PK |
| `category` | text | no | `fashion`, `beauty` 등 |
| `hashtag` | text | no | `#` 제외 저장 권장 |
| `hashtag_id` | text | yes | Instagram hashtag id |
| `is_active` | boolean | no | default true |
| `last_collected_at` | timestamptz | yes | 최근 수집 시각 |
| `created_at` | timestamptz | no | default now |
| `updated_at` | timestamptz | no | trigger |

인덱스:

- unique `(category, hashtag)`
- index `(category, is_active)`
- index `hashtag_id`

추천시스템 사용:

- 카테고리 수집 출처와 CategoryScore의 seed score 근거로 사용한다.

## `influencers`

목적: 추천 시스템에서 사용할 인플루언서 프로필 저장

| 컬럼 | 타입 | nullable | 기준 |
| --- | --- | --- | --- |
| `id` | uuid | no | PK |
| `instagram_user_id` | text | yes | Business Discovery id |
| `username` | text | no | unique |
| `display_name` | text | yes | name |
| `biography` | text | yes | bio |
| `profile_picture_url` | text | yes | 외부 URL |
| `category` | text | no | 대표 카테고리 |
| `categories` | text[] | no | default `{}` |
| `keywords` | text[] | no | default `{}` |
| `hashtags` | text[] | no | default `{}` |
| `follower_count` | integer | yes | snapshot |
| `media_count` | integer | yes | snapshot |
| `korean_score` | numeric(4,3) | no | 0~1 |
| `category_score` | numeric(4,3) | no | 0~1 |
| `source` | text | no | `mock`, `manual`, `instagram_api` |
| `status` | text | no | `approved`, `pending`, `rejected` |
| `last_discovered_at` | timestamptz | yes | 최초/최근 발견 |
| `last_synced_at` | timestamptz | yes | Business Discovery 갱신 |
| `raw_profile` | jsonb | no | default `{}` |
| `created_at` | timestamptz | no | default now |
| `updated_at` | timestamptz | no | trigger |

인덱스:

- unique `username`
- unique `instagram_user_id` where not null
- index `(category, status)`
- index `korean_score`
- index `category_score`

추천시스템 사용:

- 사용자 카테고리/키워드와 유사한 인플루언서를 찾는 기준 데이터다.

## `influencer_reels`

목적: 인플루언서별 최근 Reels/미디어 패턴 저장

| 컬럼 | 타입 | nullable | 기준 |
| --- | --- | --- | --- |
| `id` | uuid | no | PK |
| `influencer_id` | uuid | no | FK `influencers.id` |
| `instagram_media_id` | text | no | unique |
| `media_type` | text | yes | `VIDEO`, `IMAGE`, `CAROUSEL_ALBUM` |
| `media_product_type` | text | yes | `REELS` 가능 시 저장 |
| `permalink` | text | yes | 게시물 링크 |
| `thumbnail_url` | text | yes | 썸네일 |
| `media_url` | text | yes | 제공될 때만 저장 |
| `caption` | text | yes | 분석 원문 |
| `topic` | text | yes | 추출 주제 |
| `format` | text | yes | 예: GRWM, 비교, 튜토리얼 |
| `hook` | text | yes | caption/LLM 기반 추출 |
| `hashtags` | text[] | no | default `{}` |
| `like_count` | integer | yes | 제공될 때만 |
| `comments_count` | integer | yes | 제공될 때만 |
| `views` | integer | yes | 제한될 수 있음 |
| `saves` | integer | yes | 제한될 수 있음 |
| `engagement_score` | numeric(8,3) | yes | 내부 계산 |
| `posted_at` | timestamptz | yes | timestamp |
| `collected_at` | timestamptz | no | default now |
| `raw_media` | jsonb | no | default `{}` |
| `created_at` | timestamptz | no | default now |
| `updated_at` | timestamptz | no | trigger |

인덱스:

- unique `instagram_media_id`
- index `influencer_id`
- index `posted_at`
- index `engagement_score`
- index `hashtags`는 필요 시 GIN

추천시스템 사용:

- 최근 릴스 주제/포맷/해시태그/반응 패턴 분석에 사용한다.

## `influencer_candidates`

목적: 자동 승인하기 애매한 후보 검수 큐

| 컬럼 | 타입 | nullable | 기준 |
| --- | --- | --- | --- |
| `id` | uuid | no | PK |
| `username` | text | no | unique |
| `discovered_category` | text | yes | seed category |
| `discovered_hashtag` | text | yes | 발견 hashtag |
| `korean_score` | numeric(4,3) | no | 0~1 |
| `category_score` | numeric(4,3) | no | 0~1 |
| `decision_reason` | jsonb | no | 점수 근거 |
| `status` | text | no | `pending`, `approved`, `rejected` |
| `reviewed_by` | uuid | yes | 관리자 user id |
| `reviewed_at` | timestamptz | yes | 검수 시각 |
| `raw_profile` | jsonb | no | default `{}` |
| `raw_media_samples` | jsonb | no | default `[]` |
| `created_at` | timestamptz | no | default now |
| `updated_at` | timestamptz | no | trigger |

인덱스:

- unique `username`
- index `(status, discovered_category)`
- index `created_at`

추천시스템 사용:

- 직접 추천에는 사용하지 않는다. 승인 후 `influencers`로 승격한다.

## `collection_logs`

목적: 수집 job 실행 결과와 장애 추적

| 컬럼 | 타입 | nullable | 기준 |
| --- | --- | --- | --- |
| `id` | uuid | no | PK |
| `job_type` | text | no | `hashtag_collect`, `business_discovery` |
| `category` | text | yes | 대상 카테고리 |
| `hashtag` | text | yes | 대상 hashtag |
| `status` | text | no | `success`, `partial_success`, `failed` |
| `started_at` | timestamptz | no | 시작 |
| `finished_at` | timestamptz | yes | 종료 |
| `requested_count` | integer | no | default 0 |
| `saved_influencers` | integer | no | default 0 |
| `saved_reels` | integer | no | default 0 |
| `candidate_count` | integer | no | default 0 |
| `skipped_count` | integer | no | default 0 |
| `error_code` | text | yes | 실패 코드 |
| `error_message` | text | yes | 민감정보 제거 |
| `meta_usage` | jsonb | no | rate limit header 등 |
| `created_at` | timestamptz | no | default now |

인덱스:

- index `(job_type, created_at)`
- index `(status, created_at)`
- index `(category, created_at)`

RLS 기준:

- `category_seed_hashtags`: authenticated 조회, 관리자 수정은 추후
- `influencers`, `influencer_reels`: authenticated 조회, service role insert/update
- `influencer_candidates`, `collection_logs`: 관리자만 조회, service role insert/update
- 관리자 정책이 없으면 우선 service role 전용으로 두고 public 노출 금지

SQL 초안:

```sql
create table if not exists public.category_seed_hashtags (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  hashtag text not null,
  hashtag_id text,
  is_active boolean not null default true,
  last_collected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, hashtag)
);

create table if not exists public.influencers (
  id uuid primary key default gen_random_uuid(),
  instagram_user_id text,
  username text not null,
  display_name text,
  biography text,
  profile_picture_url text,
  category text not null,
  categories text[] not null default '{}',
  keywords text[] not null default '{}',
  hashtags text[] not null default '{}',
  follower_count integer,
  media_count integer,
  korean_score numeric(4,3) not null default 0,
  category_score numeric(4,3) not null default 0,
  source text not null default 'mock',
  status text not null default 'approved',
  last_discovered_at timestamptz,
  last_synced_at timestamptz,
  raw_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists influencers_username_unique_idx on public.influencers(username);
create unique index if not exists influencers_instagram_user_id_unique_idx
  on public.influencers(instagram_user_id)
  where instagram_user_id is not null;

create table if not exists public.influencer_reels (
  id uuid primary key default gen_random_uuid(),
  influencer_id uuid not null references public.influencers(id) on delete cascade,
  instagram_media_id text not null,
  media_type text,
  media_product_type text,
  permalink text,
  thumbnail_url text,
  media_url text,
  caption text,
  topic text,
  format text,
  hook text,
  hashtags text[] not null default '{}',
  like_count integer,
  comments_count integer,
  views integer,
  saves integer,
  engagement_score numeric(8,3),
  posted_at timestamptz,
  collected_at timestamptz not null default now(),
  raw_media jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instagram_media_id)
);
```

# 6. Backend 구현 가이드

현재 실제 백엔드는 TypeScript 서비스가 아니라 `apps/api` FastAPI다. 따라서 아래 Python 파일 구성이 가장 자연스럽다.

권장 파일:

- `apps/api/app/services/instagram_service.py`: Instagram Graph API HTTP client
- `apps/api/app/services/korean_judge_service.py`: KoreanScore 계산
- `apps/api/app/services/category_classifier_service.py`: CategoryScore 계산
- `apps/api/app/services/influencer_service.py`: Supabase upsert/read helper
- `apps/api/app/jobs/collect_influencers_job.py`: 수집 job orchestration
- `apps/api/app/api/routes/internal.py`: cron/internal trigger route
- `apps/api/app/api/routes/admin_instagram.py`: Phase 3 관리자 API
- `apps/api/app/schemas/instagram_collection.py`: request/response schema
- `apps/api/app/core/config.py`: Instagram env 추가

`core/config.py` 추가 필드:

```python
instagram_graph_api_base_url: str = "https://graph.facebook.com"
instagram_graph_api_version: str = "v22.0"  # 배포 시 Meta 최신 버전 확인
instagram_access_token: str | None = None
instagram_ig_user_id: str | None = None
instagram_app_id: str | None = None
instagram_app_secret: str | None = None
internal_job_secret: str | None = None
```

핵심 함수 pseudo-code:

```python
async def get_hashtag_id(hashtag: str) -> str:
    # GET /{version}/ig_hashtag_search?user_id={ig_user_id}&q={hashtag}
    # 결과가 없으면 CollectionError("HASHTAG_NOT_FOUND")
    ...

async def get_recent_media_by_hashtag(hashtag_id: str, limit: int = 25) -> list[dict]:
    # GET /{version}/{hashtag_id}/recent_media
    # fields는 caption,comments_count,id,like_count,media_type,media_url,permalink 중심
    # username/owner는 없을 수 있으므로 필수로 가정하지 않는다.
    ...

async def get_business_discovery(username: str) -> dict:
    # GET /{version}/{ig_user_id}
    # fields=business_discovery.username({username}){id,username,name,biography,profile_picture_url,followers_count,media_count,media.limit(12){id,caption,media_type,media_product_type,permalink,like_count,comments_count,timestamp}}
    ...

def judge_korean_influencer(profile: dict, media_samples: list[dict]) -> dict:
    korean_text_score = calc_hangul_ratio(profile, media_samples)
    korean_hashtag_score = calc_korean_hashtag_ratio(media_samples)
    korean_profile_score = calc_korea_keyword_score(profile)
    score = 0.45 * korean_text_score + 0.35 * korean_hashtag_score + 0.20 * korean_profile_score
    return {"score": round(score, 3), "decision": "approved" if score >= 0.6 else "pending" if score >= 0.4 else "rejected"}

def classify_instagram_category(seed_category: str, profile: dict, media_samples: list[dict]) -> dict:
    seed_score = 1.0 if seed_category else 0.0
    caption_score = calc_caption_keyword_score(media_samples)
    bio_score = calc_bio_keyword_score(profile)
    llm_score = 0.0  # fallback일 때만 채움
    score = 0.40 * seed_score + 0.35 * caption_score + 0.20 * bio_score + 0.05 * llm_score
    return {"category": best_category, "score": round(score, 3), "scores": category_scores}

async def collect_korean_influencers_job(category: str | None = None, limit: int = 25, dry_run: bool = False) -> dict:
    log_id = await save_collection_log(status="running")
    try:
        seeds = await list_active_seed_hashtags(category)
        for seed in seeds:
            hashtag_id = seed.hashtag_id or await get_hashtag_id(seed.hashtag)
            media_items = await get_recent_media_by_hashtag(hashtag_id, limit)
            # 주의: username이 없으면 Business Discovery로 바로 못 간다.
            # 이 경우 media pattern만 저장하거나, manual username seed로 보강한다.
        await finish_collection_log(log_id, status="success")
    except Exception as error:
        await finish_collection_log(log_id, status="failed", error=error)
        raise
```

Supabase upsert 기준:

```python
async def upsert_influencer(profile: dict, scores: dict) -> dict:
    payload = {
        "username": profile["username"].lower(),
        "instagram_user_id": profile.get("id"),
        "display_name": profile.get("name"),
        "biography": profile.get("biography"),
        "follower_count": profile.get("followers_count"),
        "media_count": profile.get("media_count"),
        "korean_score": scores["korean_score"],
        "category_score": scores["category_score"],
        "category": scores["category"],
        "source": "instagram_api",
        "status": "approved",
        "raw_profile": profile,
    }
    # POST /rest/v1/influencers?on_conflict=username
    ...

async def upsert_influencer_reels(influencer_id: str, media_items: list[dict]) -> None:
    # instagram_media_id 기준 upsert
    ...

async def save_collection_log(payload: dict) -> None:
    # 민감정보 제거 후 collection_logs insert
    ...
```

# 7. Frontend 구현 가이드

MVP 필수 UI:

## 추천 입력 페이지

- 위치: 기존 `/recommendations`
- 데이터: 사용자 입력, 카테고리, 목표, 선호 스타일
- API: `POST /api/recommendations`
- 상태: generating, error, success
- 주의: LLM API 직접 호출 금지

## 추천 결과 페이지

- 위치: 기존 `/recommendations/[id]`
- 데이터: `recommendations.result`
- API: `GET /api/recommendations/:id`
- 상태: loading, error, empty

## 카테고리별 인플루언서 목록

- 위치: `추가 필요`, 예: `/influencers`
- API: `GET /api/influencers?category=fashion`
- UI: category filter, influencer card, 최근 릴스 요약
- MVP에서는 사용자에게 노출하지 않고 내부 확인용으로 시작 가능

Phase 3 관리자 UI:

| 페이지 | 목적 | API |
| --- | --- | --- |
| `/admin/influencers` | 승인된 인플루언서 목록 | `GET /api/admin/influencers` |
| `/admin/candidates` | 후보 승인/거절 | `GET /api/admin/candidates`, approve/reject |
| `/admin/collection-logs` | 수집 job 로그 | `GET /api/admin/collection-logs` |
| `/admin/seed-hashtags` | seed hashtag 관리 | `GET/POST /api/admin/seed-hashtags` |

현재 `/admin/page.tsx`는 mock 기반 초안이다. Phase 3 전까지는 대량 관리자 UI를 만들지 말고, 백엔드/DB 파이프라인 검증 후 최소 화면만 붙인다.

# 8. AI/MLOps 구현 가이드

KoreanScore 관리:

- 초기 threshold: approved `>= 0.6`, pending `0.4~0.6`, rejected `< 0.4`
- threshold는 `data-design/rule-base.json` 또는 `apps/api/app/config/scoring_rules.json`로 관리
- 점수 근거는 `decision_reason`에 저장

CategoryScore 관리:

- seed hashtag category, caption keyword, bio keyword, LLM fallback 점수를 분리 저장
- top category와 second category 차이가 작으면 `influencer_candidates`로 보류
- 카테고리별 키워드 사전은 MVP에서 수동 관리

LLM fallback:

- 모든 계정에 호출하지 않는다.
- pending 후보, category 충돌, 텍스트 부족 케이스만 호출한다.
- Backend가 로컬 LLM API를 호출하고, AI/MLOps는 프롬프트와 출력 JSON schema를 제공한다.

분류용 프롬프트 출력 형식:

```json
{
  "isKoreanInfluencer": true,
  "koreanScore": 0.72,
  "category": "fashion",
  "categoryScore": 0.81,
  "keywords": ["데일리룩", "오오티디"],
  "reason": "bio와 최근 caption에 한글 패션 키워드가 반복됩니다."
}
```

실패 시 fallback:

- LLM timeout: rule-based 결과만 사용
- JSON parse 실패: candidate pending 저장
- score 불일치: candidate pending 저장
- LLM 실패 시 자동 승인 금지

평가 방식:

- 카테고리별 20개 수동 라벨링 샘플 구축
- precision 중심으로 평가한다. 잘못 승인되는 것보다 pending이 낫다.
- threshold 변경 시 `collection_logs.meta_usage` 또는 별도 평가 파일에 version 기록

# 9. API 설계

기존 Backend/Frontend 문서와 맞추기 위해 사용자 추천 API는 `/api/recommendations`를 유지한다.

| API | 목적 | 요청 body | 응답 body | 인증 | 담당 |
| --- | --- | --- | --- | --- | --- |
| `POST /api/recommendations` | 맞춤 추천 생성 | `{ category, keywords, hashtags, goal }` | `{ success, data: { requestId, recommendationId, result } }` | 로그인 필요 | Backend |
| `GET /api/recommendations` | 내 추천 목록 | 없음 | `{ success, data: [] }` | 로그인 필요 | Backend |
| `GET /api/recommendations/:id` | 추천 상세 | 없음 | `{ success, data: {} }` | 로그인 필요 | Backend |
| `GET /api/influencers` | 카테고리별 인플루언서 목록 | query `category` | `{ success, data: [] }` | 로그인 권장 | Backend |
| `POST /api/internal/collect-influencers` | 수집 job 수동 실행/cron | `{ category?, limit?, dryRun? }` | `{ success, data: { logId, saved, candidates } }` | internal secret | Backend |
| `GET /api/admin/influencers` | 승인 인플루언서 관리 | query `category,status` | `{ success, data: [] }` | 관리자 | Backend/Frontend |
| `GET /api/admin/candidates` | 후보 목록 | query `status` | `{ success, data: [] }` | 관리자 | Backend/Frontend |
| `PATCH /api/admin/candidates/:id/approve` | 후보 승인 | `{ category? }` | `{ success, data: { influencerId } }` | 관리자 | Backend |
| `PATCH /api/admin/candidates/:id/reject` | 후보 거절 | `{ reason? }` | `{ success, data: {} }` | 관리자 | Backend |
| `GET /api/admin/collection-logs` | 수집 로그 조회 | query `status,category` | `{ success, data: [] }` | 관리자 | Backend/Frontend |
| `GET /api/admin/seed-hashtags` | seed hashtag 조회 | 없음 | `{ success, data: [] }` | 관리자 | Backend/Frontend |
| `POST /api/admin/seed-hashtags` | seed hashtag 추가 | `{ category, hashtag }` | `{ success, data: {} }` | 관리자 | Backend |

공통 에러:

```json
{
  "success": false,
  "message": "에러 메시지",
  "code": "INSTAGRAM_RATE_LIMIT"
}
```

Instagram 관련 에러 코드:

- `INSTAGRAM_CONFIG_MISSING`
- `INSTAGRAM_TOKEN_EXPIRED`
- `INSTAGRAM_PERMISSION_DENIED`
- `INSTAGRAM_RATE_LIMIT`
- `INSTAGRAM_USERNAME_UNAVAILABLE`
- `INSTAGRAM_BUSINESS_DISCOVERY_FAILED`
- `COLLECTION_JOB_FAILED`

# 10. 위험 요소와 대안

| 위험 요소 | 설명 | 대안 |
| --- | --- | --- |
| 권한 승인 문제 | Hashtag Search, Business Discovery, Public Content Access는 app review가 필요할 수 있다. | MVP는 mock/seed로 진행, Phase 2에서 1개 계정/1개 hashtag POC |
| rate limit | 대량 수집 시 빠르게 제한될 수 있다. | cron 간격 확대, 캐시, field expansion, backoff, collection_logs 기록 |
| username 추출 불가 | Hashtag Recent Media에서 username/owner가 제한될 수 있다. | 수동 seed username, 후보 import, Creator Marketplace API 추후 검토 |
| Business Discovery 실패 | personal/private/non-professional 계정은 조회 실패 가능 | 실패 후보는 저장하지 않거나 pending 로그만 저장 |
| Reels 지표 제한 | views/saves/insights는 third-party media에서 제한될 수 있다. | likes/comments/caption/permalink 중심 설계, nullable 필드 사용 |
| 한국인 오분류 | 해외 계정이 한국어 해시태그를 사용할 수 있다. | pending 구간 운영, 수동 검수, threshold 보수적으로 설정 |
| 카테고리 오분류 | 해시태그가 여러 카테고리에 걸칠 수 있다. | category_scores 저장, top2 차이 작으면 pending |
| 정책 위반 리스크 | 비공식 scraping, 과도한 자동 수집은 위험하다. | 공식 Graph API만 사용, token 보호, robots/scraping 금지 |
| mock/API 구조 차이 | mock에는 username/metrics가 있지만 실제 API에는 없을 수 있다. | 실제 API nullable 기준으로 mock schema를 맞춘다 |
| Supabase 성능/비용 | reels 누적량이 빠르게 늘 수 있다. | 최근 N개만 유지, 인덱스, 오래된 raw json 정리 |
| Render cron 안정성 | job 중복/실패/timeout 가능 | idempotent upsert, job lock, dry-run, 수동 재실행 endpoint |
| token 만료 | 장기 token도 만료/폐기될 수 있다. | 만료일 관리, 알림, secret rotation 문서화 |

# 11. 최종 결론

이 방법론을 Be Celeb에 적용해도 된다. 단, **MVP 핵심 기능으로 바로 넣지 말고 Phase 2로 미루는 것이 좋다.**

현재 팀 역할 기준:

- Frontend: 추천 입력/결과 UI, 카테고리별 인플루언서 목록, Phase 3 관리자 UI
- Backend: Instagram API client, internal cron route, scoring orchestration, Supabase upsert, 추천 API 연결
- Database: Instagram 수집 테이블, 인덱스, RLS, seed hashtag/mock influencer/reels data
- AI/MLOps: KoreanScore/CategoryScore 기준, LLM fallback 프롬프트, 품질 테스트, threshold 튜닝

가장 먼저 구현해야 할 5가지:

1. `influencers`, `influencer_reels`, `category_seed_hashtags` schema와 seed data 추가
2. mock influencer/reels 데이터로 KoreanScore/CategoryScore 함수 구현
3. `/api/recommendations`가 mock 배열이 아니라 Supabase influencer/reels 데이터를 사용하도록 변경
4. OpenAI 호출 흔적을 로컬 LLM API client로 교체
5. Instagram API는 별도 POC로 hashtag 1개, 수동 username 5개만 테스트

최종 추천 아키텍처:

```txt
Phase 1 MVP:
Next.js Frontend
-> Backend API
-> Supabase mock influencer/reels
-> Rule-based similarity
-> Local LLM
-> recommendations 저장/조회

Phase 2 이후:
Render Cron/FastAPI Job
-> Instagram Graph API
-> KoreanScore/CategoryScore
-> Supabase influencers/influencer_reels
-> Recommendation API
-> Local LLM
-> User-facing recommendation result
```

핵심 결론:

- Instagram API 기반 자동 수집은 서비스 방향과 맞다.
- 하지만 공식 API 제약 때문에 `hashtag -> username 자동 수집`을 전제로 MVP를 설계하면 위험하다.
- 한 달 MVP는 mock/seed 기반으로 추천 품질과 DB/API 구조를 먼저 완성한다.
- Instagram API는 Phase 2에서 공식 권한, rate limit, username 확보 가능성을 검증한 뒤 붙인다.
