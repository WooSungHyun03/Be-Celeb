from fastapi import APIRouter

from app.domains.video_analysis.controller import generate_storyboard, transcribe_video, video_analysis_detail

router = APIRouter(prefix="/api/video-analysis", tags=["video-analysis"])

router.add_api_route("/transcribe", transcribe_video, methods=["POST"], response_model=None)
router.add_api_route("/generate-storyboard", generate_storyboard, methods=["POST"], response_model=None)
router.add_api_route("/{analysis_id}", video_analysis_detail, methods=["GET"], response_model=None)
