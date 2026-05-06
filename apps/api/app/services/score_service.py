# Provides scoring helpers for future trend ranking logic.
def normalize_score(score: int) -> int:
    # TODO: Replace with weighted scoring based on growth, engagement, and fit.
    return max(0, min(score, 100))
