# Provides mock recommendation repository methods until persistence is connected.
from app.mocks.mock_recommendations import MOCK_RECOMMENDATIONS
from app.schemas.recommendation import Recommendation


def list_mock_recommendations() -> list[Recommendation]:
    # TODO: Replace with Supabase recommendation table reads.
    return [Recommendation(**recommendation) for recommendation in MOCK_RECOMMENDATIONS]
