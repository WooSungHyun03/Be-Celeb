-- Be Celeb production seed draft.
-- This seed avoids inserting auth-owned users. Apply user/profile data through Supabase Auth flows.

insert into public.trends (
  title,
  description,
  category,
  platforms,
  score,
  growth_rate,
  direction,
  tags,
  predicted_peak
) values
(
  'AI voice-over daily vlog',
  'AI narration and captions applied to daily short-form videos.',
  'ai-video',
  array['tiktok', 'youtube-shorts'],
  87,
  18,
  'rising',
  array['ai narration', 'vlog', 'caption'],
  '2026-06-15'
),
(
  'One-bite mukbang review',
  'Short food review format centered on one-bite reactions.',
  'mukbang',
  array['instagram-reels', 'tiktok'],
  82,
  11,
  'rising',
  array['mukbang', 'food review', 'quick cut'],
  '2026-05-28'
);

insert into public.trend_rules (
  name,
  rule_type,
  category,
  platform,
  weight,
  description
) values
(
  'AI video production process boost',
  'category-fit',
  'ai-video',
  null,
  1.25,
  'AI 영상 계정에는 제작 과정, before/after, 프롬프트 공개 포맷을 우선 추천한다.'
),
(
  'TikTok repeatable hook boost',
  'platform-fit',
  null,
  'tiktok',
  1.10,
  'TikTok에서는 반복 가능한 훅과 챌린지성을 우선 평가한다.'
);
