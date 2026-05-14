# Provides scoring helpers for future trend ranking logic.
def normalize_score(score: int) -> int:
    return max(0, min(score, 100))
