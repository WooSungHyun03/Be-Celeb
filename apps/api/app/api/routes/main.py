from fastapi import APIRouter, status
from app.schemas.main import MainResponse, ServiceStats

router = APIRouter(tags=["main"])

@router.get(
    "/main", 
    response_model=MainResponse,
    status_code=status.HTTP_200_OK,
    summary="메인 페이지용 종합 데이터 조회"
)
async def get_main_page_data():
    stats = ServiceStats(
        total_users=0,
        total_recommendations=0,
        active_trends_count=0,
    )

    return MainResponse(
        stats=stats,
        popular_trends=[],
        sample_recommendation=None,
    )
