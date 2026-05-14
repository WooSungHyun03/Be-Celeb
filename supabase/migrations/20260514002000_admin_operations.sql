-- Admin operations support for the YouTube-only Be-Celeb backend.

alter table public.influencer_channels
  add column if not exists last_collected_at timestamptz;

create index if not exists idx_influencer_channels_last_collected_at
on public.influencer_channels(last_collected_at desc);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_table text not null,
  target_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_created_at
on public.admin_audit_logs(created_at desc);

create index if not exists idx_admin_audit_logs_target
on public.admin_audit_logs(target_table, target_id);

alter table public.admin_audit_logs enable row level security;

grant select, insert on public.admin_audit_logs to service_role;
grant select, insert, update, delete on public.creator_categories to service_role;
grant select, insert, update, delete on public.influencer_channels to service_role;
grant select, insert, update, delete on public.influencer_videos to service_role;
grant select, insert, update, delete on public.collection_logs to service_role;
grant select, insert, update, delete on public.user_channel_analyses to service_role;
grant select, insert, update, delete on public.recommendation_options to service_role;
grant select, insert, update, delete on public.content_recommendations to service_role;
