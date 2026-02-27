"""API v1 router — aggregates all module routers."""

from fastapi import APIRouter

from app.modules.tong_quan.router import router as tong_quan_router

api_v1_router = APIRouter()

# Register module routers
api_v1_router.include_router(tong_quan_router)
