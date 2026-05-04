# Stores mock recommendation dictionaries for FastAPI routes.
MOCK_RECOMMENDATIONS = [
    {
        "id": "rec-001",
        "title": "AI narration behind-the-scenes short",
        "summary": "Show the content creation process with AI narration.",
        "category": "ai-video",
        "platforms": ["tiktok", "youtube-shorts"],
        "priority": "high",
        "reason": "Strong fit with AI video trend growth.",
        "steps": ["Write a 3-second hook", "Record production screen", "Add mock AI narration"],
        "related_trend_ids": ["trend-001"],
        "is_saved": True,
    },
    {
        "id": "rec-002",
        "title": "One-bite restaurant comparison",
        "summary": "Compare the same menu from two places with quick reactions.",
        "category": "mukbang",
        "platforms": ["instagram-reels", "tiktok"],
        "priority": "medium",
        "reason": "Repeatable format for food creator accounts.",
        "steps": ["Pick two restaurants", "Film one-bite cuts", "Add score captions"],
        "related_trend_ids": ["trend-002"],
        "is_saved": True,
    },
]
