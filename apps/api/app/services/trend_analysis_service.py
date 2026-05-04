# Provides mock trend analysis service behavior.
from app.repositories.trend_repository import list_mock_trends
from app.schemas.trend import Trend


def get_mock_trends() -> list[Trend]:
    # TODO: Replace with SNS trend ingestion, scoring, and prediction pipeline.
    return list_mock_trends()
