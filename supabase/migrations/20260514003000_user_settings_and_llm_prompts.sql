-- User channel settings and admin-managed LLM prompt templates.

create table if not exists public.user_channel_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  channel_url text not null,
  category text not null,
  youtube_channel_id text,
  channel_title text,
  channel_thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_channel_settings_user_id
on public.user_channel_settings(user_id);

drop trigger if exists set_user_channel_settings_updated_at on public.user_channel_settings;
create trigger set_user_channel_settings_updated_at
before update on public.user_channel_settings
for each row execute function public.set_updated_at();

alter table public.user_channel_settings enable row level security;

drop policy if exists "user_channel_settings_select_own" on public.user_channel_settings;
drop policy if exists "user_channel_settings_insert_own" on public.user_channel_settings;
drop policy if exists "user_channel_settings_update_own" on public.user_channel_settings;
drop policy if exists "user_channel_settings_delete_own" on public.user_channel_settings;

create policy "user_channel_settings_select_own"
on public.user_channel_settings for select
using (auth.uid() = user_id);

create policy "user_channel_settings_insert_own"
on public.user_channel_settings for insert
with check (auth.uid() = user_id);

create policy "user_channel_settings_update_own"
on public.user_channel_settings for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_channel_settings_delete_own"
on public.user_channel_settings for delete
using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_channel_settings to authenticated;
grant select, insert, update, delete on public.user_channel_settings to service_role;

create table if not exists public.llm_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'content_recommendation',
  system_prompt text not null,
  user_prompt_template text not null,
  is_active boolean not null default false,
  variables jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_llm_prompt_templates_type_active
on public.llm_prompt_templates(type, is_active);

create unique index if not exists llm_prompt_templates_one_active_per_type_idx
on public.llm_prompt_templates(type)
where is_active = true;

drop trigger if exists set_llm_prompt_templates_updated_at on public.llm_prompt_templates;
create trigger set_llm_prompt_templates_updated_at
before update on public.llm_prompt_templates
for each row execute function public.set_updated_at();

alter table public.llm_prompt_templates enable row level security;

grant select, insert, update, delete on public.llm_prompt_templates to service_role;

insert into public.llm_prompt_templates (
  name,
  type,
  system_prompt,
  user_prompt_template,
  is_active,
  variables
)
values (
  'Default one-call YouTube content recommendation',
  'content_recommendation',
  'You are Be-Celeb''s Korean YouTube content strategist. Return valid JSON only.',
  'You are a YouTube content strategy analyst.
Analyze the user channel and category influencer database.
Recommend exactly one content idea the user has not uploaded yet.
Do not recommend content similar to the user''s existing videos.
Return valid JSON only with this schema:
{
  "recommendation": {
    "title": "string",
    "format": "string",
    "hashtags": ["string"],
    "thumbnailIdea": "string",
    "targetAudience": "string",
    "hook": "string",
    "reason": "string",
    "whyNotDuplicate": "string",
    "storyboard": [
      {"scene": 1, "duration": "0-3s", "description": "string", "caption": "string"}
    ],
    "uploadTips": ["string"]
  }
}

Selected category:
{{selected_category}}

User channel:
{{user_channel}}

User recent videos:
{{user_recent_videos}}

Category influencer database videos:
{{category_database_videos}}

Duplicate guidelines:
{{duplicate_guidelines}}',
  true,
  '{"variables":["user_channel","user_recent_videos","selected_category","category_database_videos","duplicate_guidelines"]}'::jsonb
)
on conflict do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_nickname text;
begin
  requested_nickname := nullif(trim(coalesce(new.raw_user_meta_data->>'nickname', '')), '');

  insert into public.profiles (
    user_id,
    nickname,
    youtube_channel_url,
    avatar_url,
    onboarding_completed
  )
  values (
    new.id,
    coalesce(requested_nickname, 'user_' || substring(new.id::text, 1, 8)),
    null,
    null,
    false
  )
  on conflict (user_id) do nothing;

  insert into public.creator_profiles (
    user_id,
    youtube_experience,
    categories,
    subscriber_range,
    upload_frequency,
    content_goal,
    preferred_style,
    onboarding_completed
  )
  values (
    new.id,
    null,
    '{}',
    null,
    null,
    null,
    null,
    false
  )
  on conflict (user_id) do nothing;

  insert into public.user_plans (
    user_id,
    plan_name,
    monthly_recommendation_limit,
    monthly_recommendation_used,
    renews_at
  )
  values (
    new.id,
    'free',
    5,
    0,
    date_trunc('month', now()) + interval '1 month'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;
