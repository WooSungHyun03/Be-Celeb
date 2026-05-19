from fastapi import APIRouter

from app.domains.production_board.controller import (
    add_production_board_item_from_favorite,
    patch_production_board_item_status,
    production_board_items,
)

router = APIRouter(prefix="/api/production-board", tags=["production-board"])

router.add_api_route("/items", production_board_items, methods=["GET"], response_model=None)
router.add_api_route("/items", add_production_board_item_from_favorite, methods=["POST"], response_model=None)
router.add_api_route("/items/{item_id}/status", patch_production_board_item_status, methods=["PATCH"], response_model=None)
