from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.auth.router import router as auth_router
from app.api.cards.router import router as cards_router
from app.api.cards.export import router as cards_export_router
from app.api.tags.router import router as tags_router
from app.api.upload.router import router as upload_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="SmartCard DB API",
        description="多租戶智慧名片管理系統 API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS
    origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS != "*" else ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health check
    @app.get("/api/v1/health")
    async def health_check():
        return {"status": "ok"}

    # Register API routes
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(cards_router, prefix="/api/v1")
    app.include_router(cards_export_router, prefix="/api/v1/exports")
    app.include_router(tags_router, prefix="/api/v1")
    app.include_router(upload_router, prefix="/api/v1")

    return app


app = create_app()
