# apps/api/app/schemas/main.py
from pydantic import BaseModel, Field, ConfigDict, AliasGenerator
from pydantic.alias_generators import to_camel
from typing import List, Optional

class BaseSchema(BaseModel):
    """Base schema providing snake_case to camelCase conversion for JSON communication."""
    model_config = ConfigDict(
        alias_generator=AliasGenerator(
            validation_alias=to_camel,
            serialization_alias=to_camel,
        ),
        populate_by_name=True,
    )

# 서비스 소개 및 통계 수치
class ServiceStats(BaseSchema):
    total_users: int = Field(..., description="누적 크리에이터 수")
    total_recommendations: int = Field(..., description="누적 추천 콘텐츠 수")
    active_trends_count: int = Field(..., description="실시간 분석 중인 트렌드 수")

# 인기 트렌드 요약
class ServiceContent(BaseSchema):
    section: str = Field(..., description="메인 페이지 섹션 키")
    title: str = Field(..., description="서비스 소개 제목")
    description: str = Field(..., description="서비스 소개 설명")
    sort_order: int = Field(default=0, description="노출 순서")


class TrendSummary(BaseSchema):
    id: str = Field(..., description="트렌드 고유 ID")
    title: str = Field(..., description="트렌드 제목")
    description: str = Field(..., description="트렌드 상세 설명")
    category: str = Field(..., description="카테고리")
    platforms: List[str] = Field(..., description="해당 플랫폼 (YouTube)")
    score: int = Field(..., description="트렌드 점수 (0-100)")
    growth_rate: int = Field(..., description="성장률 (%)")
    direction: str = Field(..., description="추세 (rising, stable, watch)")
    tags: List[str] = Field(..., description="관련 태그 목록")
    predicted_peak: Optional[str] = Field(None, description="예상 피크 시점")
    created_at: Optional[str] = Field(None, description="생성 일시")

# 맛보기 추천 콘텐트 샘플
class SampleRecommendation(BaseSchema):
    id: str = Field(..., description="추천 고유 ID")
    title: str = Field(..., description="추천 콘텐츠 제목")
    summary: str = Field(..., description="콘텐츠 요약")
    category: str = Field(..., description="카테고리")
    platforms: List[str] = Field(..., description="추천 YouTube 형식")
    priority: str = Field(..., description="우선순위 (high, medium, low)")
    expected_score: int = Field(..., description="추천 적합도 점수")
    hook_text: str = Field(..., description="도입부 3초 후킹 멘트")
    content_plan: List[str] = Field(..., description="YouTube 콘텐츠 구성안")
    hashtags: List[str] = Field(..., description="추천 해시태그 목록")
    reason: str = Field(..., description="추천 이유")
    steps: List[str] = Field(..., description="실행 단계 가이드")
    related_trend_ids: List[str] = Field(..., description="연관 트렌드 ID 목록")
    is_saved: bool = Field(default=False, description="저장 여부")

# 메인 페이지 종합 응답 규격
class MainResponse(BaseSchema):
    stats: ServiceStats
    service_contents: List[ServiceContent] = Field(default_factory=list)
    popular_trends: List[TrendSummary]
    sample_recommendation: Optional[SampleRecommendation] = None

