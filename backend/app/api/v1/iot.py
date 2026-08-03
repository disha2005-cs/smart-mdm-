from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List

router = APIRouter()

class TelemetryData(BaseModel):
    device_id: str
    temperature: float
    humidity: float
    weight: float

@router.post("/telemetry", status_code=status.HTTP_201_CREATED)
def receive_telemetry(data: TelemetryData):
    """
    Mock endpoint to receive IoT telemetry data (e.g. from smart containers).
    In Phase 8+, this would store the data in TimescaleDB or similar.
    """
    # Just print it for now or return a success
    print(f"Received IoT telemetry from {data.device_id}: Temp {data.temperature}C, Weight: {data.weight}kg")
    
    # Example logic: If weight drops below a certain threshold, we could trigger an alert here.
    return {"status": "success", "message": "Telemetry received"}
