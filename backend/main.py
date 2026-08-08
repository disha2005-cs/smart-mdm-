from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.bootstrap import seed_demo_data
from app.core.config import settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Seed data runs separately via seed.py
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="Smart Mid-Day Meal Management System API",
        lifespan=lifespan,
    )

    # CORS setup (Supports localhost and ngrok)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:8080",
            "http://localhost:5173",
            "http://localhost:5174",
            "https://hopeless-polly-unexpectably.ngrok-free.dev",
            "file://"
        ],
        allow_origin_regex=r"https://.*\.ngrok-free\.(dev|app|io)",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # Security Headers Middleware
    @app.middleware("http")
    async def add_security_headers(request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # Include routers
    from app.api.v1 import alerts, attendance, auth, dashboard, inventory, iot, reports, schools, students, users, system
    app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
    app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
    app.include_router(schools.router, prefix=f"{settings.API_V1_STR}/schools", tags=["schools"])
    app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
    app.include_router(students.router, prefix=f"{settings.API_V1_STR}/students", tags=["students"])
    app.include_router(attendance.router, prefix=f"{settings.API_V1_STR}/attendance", tags=["attendance"])
    app.include_router(inventory.router, prefix=f"{settings.API_V1_STR}/inventory", tags=["inventory"])
    app.include_router(alerts.router, prefix=f"{settings.API_V1_STR}/alerts", tags=["alerts"])
    app.include_router(iot.router, prefix=f"{settings.API_V1_STR}/iot", tags=["iot"])
    app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])
    app.include_router(system.router, prefix=f"{settings.API_V1_STR}/system", tags=["system"])

    @app.get("/health")
    def health_check():
        return {"status": "ok", "message": "Smart Mid-Day Meal API is running"}

    return app

app = create_app()

if __name__ == "__main__":
    logger.info("Starting up Smart Mid-Day Meal API...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
