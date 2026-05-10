from fastapi import APIRouter
from app.api.routes import main

api_router = APIRouter()

# 메인 페이지 라우터를 맛터 라우터에 등록
api_router.include_router(main.router, tags=["Main"])

# 추후 아래처럼 다른 라우터도 한곳에 등록하여 관리