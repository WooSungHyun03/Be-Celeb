from pydantic import BaseModel, Field
from typing import List

# 서비스 소개 및 통계 수치
class ServiceStats(BaseModel):
    total_users: int = Field(..., description="누적 크리에이터 수")
    total_recommendations: int = Field(..., description="누적 추천 콘텐츠 수")
    active_trends_count: int = Field(..., description="실시간 분석 중인 트렌드 수")

# 인기 트렌드 요약
class TrendSummary(BaseModel):
    rank: int = Field(..., description="트렌드 순위")
    keyword: str = Field(..., description="트렌드 키워드/주제")
    growth_rate: str = Field(..., description="성장세 (예: +154%, Hot 등)")

# 맛보기 추천 콘텐트 샘플
class SampleRecommendation(BaseModel):
    topic: str = Field(..., description="추천 릴스 주제")
    keywords: List[str] = Field(..., description="추천 키워드 목록")
    hashtags: List[str] = Field(..., description="추천 해시태그 목록")
    hooking_text: str = Field(..., description="도입부 3초 후킹 멘트")
    script_outline: List[str] = Field(..., description="릴스 영상 3단 구성안 (도입-전개-결말)")

# 메인 페이지 종합 응답 규격
class MainResponse(BaseModel):
    stats: ServiceStats
    popular_trends: List[TrendSummary]
    sample_recommendation: SampleRecommendation