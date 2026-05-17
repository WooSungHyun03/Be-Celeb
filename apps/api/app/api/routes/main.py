from fastapi import APIRouter, status
from app.schemas.main import MainResponse
from app.services.main_service import get_main_page_data as fetch_main_page_data

router = APIRouter(tags=["main"])

@router.get(
    "/main", 
    response_model=MainResponse,
    status_code=status.HTTP_200_OK,
    summary="메인 페이지용 종합 데이터 조회"
)
async def get_main_page_data():
    return await fetch_main_page_data()
