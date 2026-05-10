# Database 담당 업데이트 검토 피드백

검토 대상:

- `role/Database.md`
- `supabase/schema.sql`
- `supabase/policies.sql`
- `supabase/seed.sql`

## 1. 최종 판단



### 3.2 새 RLS policy가 idempotent하지 않음

기존 policy들은 `DROP POLICY IF EXISTS` 후 `CREATE POLICY` 구조다.

그런데 새로 추가된 아래 policy들은 drop 없이 바로 `create policy`만 사용한다.

- `influencers_select_public`
- `reels_select_public`
- `recommendation_requests_select_own`
- `recommendation_requests_insert_own`
- `recommendations_select_own`

문제:

- `policies.sql`을 두 번 실행하면 “policy already exists” 오류가 날 수 있다.
- 현재 다른 policy 작성 방식과도 일관되지 않는다.

권장 수정:

```sql
DROP POLICY IF EXISTS "influencers_select_public" ON public.influencers;
CREATE POLICY "influencers_select_public"
ON public.influencers FOR SELECT
USING (true);
```

나머지 새 policy도 동일하게 `DROP POLICY IF EXISTS`를 추가한다.

우선순위: **높음**

### 3.3 새 테이블 explicit grant 누락

현재 `policies.sql`은 기존 공개 테이블에만 explicit grant를 준다.

현재 grant 있음:

- `trends`
- `products`
- `service_contents`
- `sample_recommendations`
- `strategy_articles`
- `error_logs`
- `not_found_logs`

새 테이블에는 grant가 없다.

- `influencers`
- `reels`
- `recommendation_requests`
- `recommendations`

Supabase 환경에서 기본 grant 상태에 따라 동작할 수도 있지만, 현재 파일이 explicit grant 방식을 쓰고 있으므로 새 테이블도 명시하는 것이 안전하다.

권장:

```sql
GRANT SELECT ON public.influencers TO anon, authenticated;
GRANT SELECT ON public.reels TO anon, authenticated;
GRANT SELECT, INSERT ON public.recommendation_requests TO authenticated;
GRANT SELECT ON public.recommendations TO authenticated;
```

`recommendations` insert/update는 service role 기준이면 authenticated grant를 주지 않는다.

우선순위: **높음**

### 3.4 Auth signup trigger 책임 범위 확인 필요

`schema.sql`에 `public.handle_new_user()`와 `on_auth_user_created` trigger가 추가되어 있다.

동작:

- Auth user 생성 시 `profiles` 생성
- `creator_profiles` 생성
- `user_plans` 생성

이 방식 자체는 DB 관점에서 가능하다.
다만 Backend 가이드에서는 회원가입 API가 회원가입 후 기본 row를 생성하는 흐름으로 되어 있었다.

문제:

- DB trigger와 Backend signup API가 같은 row를 동시에 만들면 중복/충돌 가능성이 있다.
- trigger가 기본 nickname을 `user_xxxxxxxx`로 만들고, Backend가 사용자가 입력한 nickname을 다시 반영해야 하는 구조가 된다.

권장:

- 기본 row 생성 책임을 DB trigger로 가져갈지, Backend API로 둘지 팀 합의
- DB trigger를 유지한다면 Backend signup에서는 기본 row insert를 하지 말고 필요한 필드 update만 수행
- Backend가 담당한다면 trigger는 제거하거나 사용하지 않는 방향으로 정리

우선순위: **높음**

### 3.5 `orders`, `payments`는 아직 미구현

`role/Database.md`에서는 `orders`, `payments`를 4순위/추후로 분류했다.

판단:

- 현재 미구현이어도 MVP 1차 추천 흐름을 막지는 않음
- 결제/주문 상태 저장을 MVP에 포함한다면 추후 추가 필요

필요 조치:

- `role/Database.md`에서 계속 4순위/추후로 유지
- 이번 검수에서는 완료 필수 항목으로 보지 않아도 됨

### 3.6 `strategy_articles`가 문서 필수 테이블 목록에 없음

현재 `schema.sql`과 `seed.sql`에는 `strategy_articles`가 있다.
하지만 `role/Database.md` 필수 테이블 표에는 없다.

필요 조치:

- 인스타 공략글을 MVP에 포함한다면 `role/Database.md` 필수 테이블 목록에 추가
- 아니면 “선행 구현”으로 표시

우선순위: 중간


보완 필요:

- [ ] `role/Database.md` 현재 상태/체크리스트 최신화
- [ ] 새 RLS policy에 `DROP POLICY IF EXISTS` 추가
- [ ] `influencers`, `reels`, `recommendation_requests`, `recommendations` explicit grant 추가
- [ ] Auth signup trigger와 Backend signup 책임 범위 합의
- [ ] `strategy_articles`를 문서 필수 테이블에 추가하거나 선행 구현으로 표시
- [ ] 실제 Supabase schema/policies/seed 적용 테스트
- [ ] RLS 접근 테스트

추후:

- [ ] `orders`
- [ ] `payments`
- [ ] `plans` 고도화


