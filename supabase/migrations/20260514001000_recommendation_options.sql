-- Stores first-step recommendation options for the two-step YouTube workflow.

create table if not exists public.recommendation_options (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.user_channel_analyses(id) on delete cascade,
  option_id text not null,
  selected_category text not null,
  option_payload jsonb not null default '{}'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (analysis_id, option_id)
);

create index if not exists idx_recommendation_options_analysis_id
on public.recommendation_options(analysis_id);

create index if not exists idx_recommendation_options_created_at
on public.recommendation_options(created_at desc);

alter table public.recommendation_options enable row level security;

drop policy if exists "recommendation_options_select_own" on public.recommendation_options;
create policy "recommendation_options_select_own"
on public.recommendation_options for select
using (
  exists (
    select 1
    from public.user_channel_analyses
    where user_channel_analyses.id = recommendation_options.analysis_id
      and user_channel_analyses.user_id = auth.uid()
  )
);

grant select on public.recommendation_options to authenticated;
grant select, insert, update on public.recommendation_options to service_role;
