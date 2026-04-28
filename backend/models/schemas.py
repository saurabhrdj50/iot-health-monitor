from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class HealthStatusEnum(str, Enum):
    NORMAL = "Normal"
    STRESS = "Stress"
    RISK = "Risk"


class VitalSignsInput(BaseModel):
    heart_rate: float = Field(..., ge=30, le=250, description="Heart rate in BPM")
    respiratory_rate: float = Field(..., ge=5, le=40, description="Respiratory rate per minute")
    body_temperature: Optional[float] = Field(default=None, ge=25, le=45, description="Body temperature in Celsius")
    spo2: float = Field(..., ge=70, le=100, description="Oxygen saturation percentage")
    gsr: Optional[float] = Field(default=None, description="Galvanic skin response")
    timestamp: Optional[str] = Field(default=None, description="ISO-8601 timestamp")

    @field_validator("body_temperature")
    @classmethod
    def validate_temperature(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        if value < 35 or value > 42:
            raise ValueError("Temperature seems abnormal for this system.")
        return value


class PredictionResponse(BaseModel):
    prediction: HealthStatusEnum
    confidence_score: float
    anomaly_flag: bool
    probability: Dict[str, float]
    input_features: Dict[str, float]
    metadata: Dict[str, Any]


class VitalSignsResponse(BaseModel):
    heart_rate: float
    respiratory_rate: float
    body_temperature: Optional[float] = None
    spo2: float
    gsr: Optional[float] = None
    timestamp: str
    prediction: Optional[HealthStatusEnum] = None
    confidence_score: Optional[float] = None
    anomaly_flag: Optional[bool] = None
    probability: Optional[Dict[str, float]] = None


class DashboardSnapshot(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    latest: Optional[VitalSignsResponse] = None
    history: List[VitalSignsResponse] = Field(default_factory=list)
    source: str
    model_loaded: bool
    updated_at: Optional[str] = None


class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: str
    timestamp: str
    version: str
    model_loaded: bool


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: str
