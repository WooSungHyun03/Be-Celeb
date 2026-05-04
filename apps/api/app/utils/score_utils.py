# Provides utility score labels for future API responses.
def score_label(score: int) -> str:
    if score >= 85:
        return "high"

    if score >= 70:
        return "medium"

    return "watch"
