# Provides mock trend repository methods until Supabase persistence is connected.
from app.mocks.mock_trends import MOCK_TRENDS
from app.schemas.trend import Trend


def list_mock_trends() -> list[Trend]:
    # TODO: Replace with Supabase or analytics warehouse reads.
    return [Trend(**trend) for trend in MOCK_TRENDS]
