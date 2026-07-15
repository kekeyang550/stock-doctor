from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import refresh_scheduler, router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    refresh_scheduler.start()
    try:
        yield
    finally:
        await refresh_scheduler.stop()


def create_app() -> FastAPI:
    app = FastAPI(
        title="A-Share Stock Doctor API",
        version="0.1.0",
        description="MVP API for explainable A-share stock diagnosis.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:30080",
            "http://127.0.0.1:30080",
        ],
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type"],
    )
    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
