# apps/api/app/api/routes/main.py
from fastapi import APIRouter, status
from app.schemas.main import MainResponse, ServiceStats, TrendSummary, SampleRecommendation
from app.repositories.trend_repository import list_mock_trends
from app.repositories.recommendation_repository import list_mock_recommendations

router = APIRouter(tags=["main"])

@router.get(
    "/main", 
    response_model=MainResponse,
    status_code=status.HTTP_200_OK,
    summary="메인 페이지용 종합 데이터 조회"
)
async def get_main_page_data():
    # Repository를 통해 중앙 집중화된 Mock 데이터 로드
    trends = list_mock_trends()
    recommendations = list_mock_recommendations()

    # 1. 서비스 소개 데이터 (통계 수치 계산 또는 Mock 적용)
    stats = ServiceStats(
        total_users=1240,
        total_recommendations=len(recommendations) * 100, # 예시를 위해 보정
        active_trends_count=len(trends)
    )
    
    # 2. 인기 트렌드 요약 데이터 (상위 2개 추출 및 스키마 변환)
    # Trend 객체를 TrendSummary 규격에 맞게 변환하여 전달합니다.
    popular_trends = [
        TrendSummary(**trend.model_dump()) 
        for trend in trends[:2]
    ]
    
    # 3. 추천 콘텐츠 샘플 조회
    # 첫 번째 추천 아이템을 샘플로 사용합니다.
    raw_rec_data = recommendations[0].model_dump() if recommendations else {}
    
    # DB 스키마(Recommendation) 필드명을 웹 스키마(SampleRecommendation) 규격에 맞게 매핑
    sample_rec_data = {}
    if raw_rec_data:
        sample_rec_data = {
            **raw_rec_data,
            # DB 필드명(hook_text 등)이 있을 경우 우선적으로 매핑
            "hook": raw_rec_data.get("hook_text") or raw_rec_data.get("hook"),
            "outline": raw_rec_data.get("content_plan") or raw_rec_data.get("outline"),
            "score": raw_rec_data.get("expected_score") or raw_rec_data.get("score"),
        }
    
    # Recommendation 모델과 SampleRecommendation 모델의 필드 차이가 있을 수 있으므로 
    # 명시적으로 변환하여 전달합니다.
    sample_recommendation = SampleRecommendation(**sample_rec_data) if sample_rec_data else None
    
    return MainResponse(
        stats=stats,
        popular_trends=popular_trends,
        sample_recommendation=sample_recommendation
    )