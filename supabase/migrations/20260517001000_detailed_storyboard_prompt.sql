-- Update the seeded one-call prompt so storyboard scenes include filming details.

update public.llm_prompt_templates
set
  user_prompt_template = $prompt$
You are a YouTube content strategy analyst.
Analyze the user channel and category influencer database.
Recommend exactly one content idea the user has not uploaded yet.
Do not recommend content similar to the user's existing videos.
The storyboard must contain 6 to 10 detailed scenes. Each scene must be specific enough for a creator to film it.
Each storyboard scene must include duration, visual, dialogue, caption, and shootingTip.
Support both YouTube Shorts and standard YouTube videos.
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
      {
        "scene": 1,
        "duration": "0-5s",
        "visual": "string",
        "dialogue": "string",
        "caption": "string",
        "shootingTip": "string"
      }
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
{{duplicate_guidelines}}
$prompt$,
  updated_at = now()
where name = 'Default one-call YouTube content recommendation'
  and type = 'content_recommendation';
