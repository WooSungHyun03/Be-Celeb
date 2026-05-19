from fastapi import APIRouter

from app.domains.calendar.controller import add_calendar_event, calendar_events, patch_calendar_event, remove_calendar_event

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

router.add_api_route("/events", calendar_events, methods=["GET"], response_model=None)
router.add_api_route("/events", add_calendar_event, methods=["POST"], response_model=None)
router.add_api_route("/events/{event_id}", patch_calendar_event, methods=["PATCH"], response_model=None)
router.add_api_route("/events/{event_id}", remove_calendar_event, methods=["DELETE"], response_model=None)
