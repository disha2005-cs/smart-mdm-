"""
IoT telemetry intake.

Placeholder for the smart-container integration: it validates and logs what a
device sends but does not persist anything yet. It is authenticated so an
unauthenticated caller cannot spam the logs.
"""
from fastapi import APIRouter, Depends, status
from loguru import logger
from pydantic import BaseModel, Field

from app.api import deps

router = APIRouter()


class TelemetryData(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=64)
    temperature: float = Field(..., ge=-50, le=150, description="degrees Celsius")
    humidity: float = Field(..., ge=0, le=100, description="relative humidity %")
    weight: float = Field(..., ge=0, le=10_000, description="kilograms")


@router.post("/telemetry", status_code=status.HTTP_201_CREATED)
def receive_telemetry(
    data: TelemetryData,
    current_user=Depends(deps.get_current_user),
):
    """
    Accept a telemetry reading from a smart container.

    Not yet stored: a future revision will persist these to a time-series table
    and raise a low-stock alert when the weight drops below a threshold.
    """
    logger.info(
        f"IoT telemetry from {data.device_id}: "
        f"{data.temperature}C, {data.humidity}% RH, {data.weight}kg"
    )
    return {
        "status": "success",
        "message": "Telemetry received",
        "device_id": data.device_id,
        "stored": False,
    }
