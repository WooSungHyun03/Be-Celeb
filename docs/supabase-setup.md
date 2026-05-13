# Supabase Database Workflow

이 프로젝트의 DB 변경은 Supabase CLI migration을 기준으로 배포합니다.

## 적용한 방식

- `supabase/config.toml`: Supabase CLI 프로젝트 설정
- `supabase/migrations/20260513000000_initial_schema.sql`: 기존 `supabase/schema.sql`에서 만든 초기 schema migration
- `supabase/migrations/20260513001000_initial_policies.sql`: 기존 `supabase/policies.sql`에서 만든 초기 RLS/grant migration
- `.github/workflows/supabase-db.yml`: `main` 브랜치에 migration 변경이 들어오면 원격 Supabase DB에 `supabase db push` 실행

`supabase/schema.sql`과 `supabase/policies.sql`은 현재 스키마 참고용 snapshot입니다. 새 DB 변경은 반드시 `supabase/migrations/`에 새 migration 파일로 추가합니다.

## 최초 설정

GitHub repository secrets에 다음 값을 등록합니다.

- `SUPABASE_ACCESS_TOKEN`: Supabase account access token
- `SUPABASE_PROJECT_REF`: Supabase project ref
- `SUPABASE_DB_PASSWORD`: hosted Postgres database password

로컬에서 원격 프로젝트를 연결할 때는 다음 명령을 사용합니다.

```sh
npm run db:link -- --project-ref <project-ref>
```

## 변경 절차

1. 새 migration을 만듭니다.

```sh
npm run db:migration:new -- add_some_change
```

2. 생성된 `supabase/migrations/<timestamp>_add_some_change.sql`에 SQL을 작성합니다.

3. 로컬 Supabase를 쓰는 경우 reset으로 검증합니다.

```sh
npm run db:reset
```

4. 원격 DB에는 push로 반영합니다.

```sh
npm run db:push
```

## Seed 적용

`supabase/seed.sql`은 운영 데이터까지 덮어쓸 수 있으므로 자동 push에는 포함하지 않습니다. 필요할 때만 수동으로 실행합니다.

```sh
npm run db:push:seed
```

GitHub Actions에서도 `Supabase Database Deploy` 워크플로를 수동 실행하면서 `include_seed`를 켤 수 있습니다.
