from fastapi import APIRouter

from app.domains.production_board.controller import (
    add_production_board_checklist_item,
    add_production_board_item_from_favorite,
    patch_production_board_item_memo,
    patch_production_board_checklist_item,
    patch_production_board_item_status,
    production_board_checklist_items,
    production_board_items,
    remove_production_board_item,
    remove_production_board_checklist_item,
)

router = APIRouter(prefix="/api/production-board", tags=["production-board"])

router.add_api_route("/items", production_board_items, methods=["GET"], response_model=None)
router.add_api_route("/items", add_production_board_item_from_favorite, methods=["POST"], response_model=None)
router.add_api_route("/items/{item_id}/checklist", production_board_checklist_items, methods=["GET"], response_model=None)
router.add_api_route("/items/{item_id}/checklist", add_production_board_checklist_item, methods=["POST"], response_model=None)
router.add_api_route("/items/{item_id}/memo", patch_production_board_item_memo, methods=["PATCH"], response_model=None)
router.add_api_route("/items/{item_id}/status", patch_production_board_item_status, methods=["PATCH"], response_model=None)
router.add_api_route("/items/{item_id}", remove_production_board_item, methods=["DELETE"], response_model=None)
router.add_api_route("/checklist/{checklist_item_id}", patch_production_board_checklist_item, methods=["PATCH"], response_model=None)
router.add_api_route("/checklist/{checklist_item_id}", remove_production_board_checklist_item, methods=["DELETE"], response_model=None)
