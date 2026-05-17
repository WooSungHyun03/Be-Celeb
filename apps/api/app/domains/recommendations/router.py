from fastapi import APIRouter

from app.domains.recommendations.controller import analyze_channel, content_plan, recommendation_detail, recommendation_options, recommend_content

router = APIRouter(prefix="/api", tags=["recommendations"])

router.add_api_route("/recommend-content", recommend_content, methods=["POST"], response_model=None)
router.add_api_route("/recommendations/{recommendation_id}", recommendation_detail, methods=["GET"], response_model=None)
router.add_api_route("/analyze-channel", analyze_channel, methods=["POST"], response_model=None)

# Legacy compatibility routes. The dashboard no longer uses these.
router.add_api_route("/recommend-options", recommendation_options, methods=["POST"], response_model=None)
router.add_api_route("/generate-content-plan", content_plan, methods=["POST"], response_model=None)
