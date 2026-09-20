from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from loguru import logger
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.config import settings
from app.db_bootstrap import sync_schema

UPLOAD_ROOT = Path("uploads")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # The uploads mount fails outright if the directory is missing, so create
    # it before anything is served.
    for sub in ("students", "attendance"):
        (UPLOAD_ROOT / sub).mkdir(parents=True, exist_ok=True)

    sync_schema()
    logger.info(f"{settings.PROJECT_NAME} v{settings.VERSION} ready")
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="Smart Mid-Day Meal Management System API",
        lifespan=lifespan,
    )

    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

    for extra in settings.cors_origins():
        if extra not in allowed_origins:
            allowed_origins.append(extra)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=r"https://.*\.ngrok-free\.(dev|app|io)",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # ------------------------------------------------------ error handling

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_: Request, exc: RequestValidationError):
        """
        Flatten pydantic errors into one readable sentence.

        The default payload is a nested array the UI rendered as "[object
        Object]"; this gives the operator something actionable instead.
        """
        messages = []
        for error in exc.errors():
            location = " → ".join(str(part) for part in error.get("loc", []) if part not in ("body", "query"))
            messages.append(f"{location}: {error.get('msg')}" if location else str(error.get("msg")))
        return JSONResponse(status_code=422, content={"detail": "; ".join(messages) or "Invalid request"})

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(_: Request, exc: IntegrityError):
        logger.warning(f"Database constraint violation: {exc.orig}")
        return JSONResponse(
            status_code=409,
            content={"detail": "This record conflicts with existing data. Refresh and try again."},
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_error_handler(_: Request, exc: SQLAlchemyError):
        # Never leak SQL or connection strings to the client.
        logger.exception(f"Database error: {exc}")
        return JSONResponse(
            status_code=503,
            content={"detail": "The database is temporarily unavailable. Please try again."},
        )

    # ------------------------------------------------------------- routers

    from app.api.v1 import (
        alerts,
        allocations,
        attendance,
        auth,
        budgets,
        dashboard,
        inventory,
        iot,
        meals,
        reports,
        schools,
        students,
        system,
        users,
    )

    prefix = settings.API_V1_STR
    app.include_router(auth.router, prefix=f"{prefix}/auth", tags=["auth"])
    app.include_router(users.router, prefix=f"{prefix}/users", tags=["users"])
    app.include_router(dashboard.router, prefix=f"{prefix}/dashboard", tags=["dashboard"])
    app.include_router(schools.router, prefix=f"{prefix}/schools", tags=["schools"])
    app.include_router(students.router, prefix=f"{prefix}/students", tags=["students"])
    app.include_router(attendance.router, prefix=f"{prefix}/attendance", tags=["attendance"])
    app.include_router(inventory.router, prefix=f"{prefix}/inventory", tags=["inventory"])
    app.include_router(alerts.router, prefix=f"{prefix}/alerts", tags=["alerts"])
    app.include_router(iot.router, prefix=f"{prefix}/iot", tags=["iot"])
    app.include_router(reports.router, prefix=f"{prefix}/reports", tags=["reports"])
    app.include_router(meals.router, prefix=f"{prefix}/meals", tags=["meals"])
    app.include_router(allocations.router, prefix=f"{prefix}/allocations", tags=["food-allocations"])
    app.include_router(budgets.router, prefix=f"{prefix}/budgets", tags=["budgets"])
    # Previously defined but never registered, so its endpoints 404'd.
    app.include_router(system.router, prefix=f"{prefix}/system", tags=["system"])

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")

    @app.get("/health")
    def health_check():
        return {"status": "ok", "message": "Smart Mid-Day Meal API is running", "version": settings.VERSION}

    @app.get(f"{prefix}/health")
    def api_health_check():
        return {"status": "ok", "version": settings.VERSION}

    return app


app = create_app()

if __name__ == "__main__":
    logger.info("Starting up Smart Mid-Day Meal API...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
