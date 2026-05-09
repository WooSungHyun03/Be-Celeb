# apps/api/app/api/routes/main.py
from fastapi import APIRouter, status
from app.schemas.main import MainResponse, ServiceStats, TrendSummary, SampleRecommendation

router = APIRouter(tags=["main"])

@router.get(
    "/main", 
    response_model=MainResponse,
    status_code=status.HTTP_200_OK,
    summary="메인 페이지용 종합 데이터 조회"
)
async def get_main_page_data():
    # 1. 서비스 소개 데이터 (우선 목데이터 적용)
    stats = ServiceStats(
        total_users=1240,
        total_recommendations=8420,
        active_trends_count=45
    )
    
    # 2. 인기 트렌드 요약 데이터 (목데이터)
    popular_trends = [
        TrendSummary(rank=1, keyword="개발자 일상 브이로그", growth_rate="+154%"),
        TrendSummary(rank=2, keyword="직장인 점메추 (점심 메뉴 추천)", growth_rate="+98%"),
        TrendSummary(rank=3, keyword="초보자용 3분 요리 꿀팁", growth_rate="Hot"),
    ]
    
    # 3. 추천 콘텐츠 샘플 조회 (목데이터)
    sample_recommendation = SampleRecommendation(
        topic="연봉 1억 개발자의 출근 가방 속 필수 아이템 (What's in my bag)",
        keywords=["개발자", "데스크테리어", "WhatsInMyBag", "직장인"],
        hashtags=["#개발자일상", "#WhatsInMyBag", "#직장인스타그램", "#릴스추천"],
        hooking_text="연봉 1억 개발자는 출근할 때 가방에 '이것'을 꼭 챙깁니다.",
        script_outline=[
            "0~3초 (도입): 가방을 가볍게 던지며 시선을 끌고, 자막으로 후킹 멘트 노출",
            "3~25초 (전개): 실제 사용하는 생산성 아이템(기계식 키보드, 안약 등)을 감성적인 음악과 함께 빠른 컷 편집으로 소개",
            "25~30초 (결말): 가장 애용하는 원픽 아이템을 강조하며 '여러분 가방 속 필수템은 무엇인가요?' 댓글 참여 유도"
        ]
    )
    
    return MainResponse(
        stats=stats,
        popular_trends=popular_trends,
        sample_recommendation=sample_recommendation
    )