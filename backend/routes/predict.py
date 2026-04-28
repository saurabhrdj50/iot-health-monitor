from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, status

from backend.models.schemas import DashboardSnapshot, HealthResponse, PredictionResponse, VitalSignsInput, VitalSignsResponse

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_HISTORY_ITEMS = 60
DEFAULT_BODY_TEMPERATURE = 36.8
history_store: List[Dict[str, Any]] = []
latest_snapshot: Dict[str, Any] | None = None
inference_engine = None

try:
    from ml.inference_engine import create_inference_engine

    inference_engine = create_inference_engine()
    logger.info("Inference engine loaded successfully")
except Exception as exc:  # pragma: no cover
    logger.warning("Could not load inference engine: %s", exc)


def _ensure_timestamp(raw_timestamp: str | None) -> str:
    if raw_timestamp:
        try:
            return datetime.fromisoformat(raw_timestamp.replace("Z", "+00:00")).isoformat()
        except ValueError:
            logger.warning("Invalid timestamp received: %s", raw_timestamp)
    return datetime.now().isoformat()


def _fallback_prediction(data: Dict[str, Any]) -> Dict[str, Any]:
    hr = float(data["heart_rate"])
    spo2 = float(data["spo2"])
    temp = float(data["body_temperature"]) if data.get("body_temperature") is not None else DEFAULT_BODY_TEMPERATURE
    rr = float(data["respiratory_rate"])

    if hr < 60 or hr > 100 or spo2 < 94 or temp > 37.5 or temp < 36.0 or rr < 12 or rr > 20:
        prediction = "Risk"
        confidence = 0.82
        probability = {"Normal": 0.10, "Stress": 0.28, "Risk": 0.62}
    elif hr > 85 or hr < 65 or spo2 < 96 or temp > 37.2 or temp < 36.5:
        prediction = "Stress"
        confidence = 0.74
        probability = {"Normal": 0.24, "Stress": 0.58, "Risk": 0.18}
    else:
        prediction = "Normal"
        confidence = 0.90
        probability = {"Normal": 0.84, "Stress": 0.12, "Risk": 0.04}

    return {
        "prediction": prediction,
        "confidence_score": confidence,
        "anomaly_flag": prediction != "Normal",
        "probability": probability,
        "input_features": {
            "heart_rate": hr,
            "respiratory_rate": rr,
            "body_temperature": temp,
            "spo2": spo2,
        },
        "metadata": {
            "timestamp": data["timestamp"],
            "model_loaded": False,
            "scaler_loaded": False,
            "fallback_mode": True,
            "temperature_inferred": data.get("body_temperature") is None,
        },
    }


def _persist_snapshot(payload: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, Any]:
    global latest_snapshot

    snapshot = {
        "heart_rate": float(payload["heart_rate"]),
        "respiratory_rate": float(payload["respiratory_rate"]),
        "body_temperature": None if payload.get("body_temperature") is None else float(payload["body_temperature"]),
        "spo2": float(payload["spo2"]),
        "gsr": None if payload.get("gsr") is None else float(payload["gsr"]),
        "timestamp": payload["timestamp"],
        "prediction": result["prediction"],
        "confidence_score": float(result["confidence_score"]),
        "anomaly_flag": bool(result["anomaly_flag"]),
        "probability": result["probability"],
    }

    history_store.append(snapshot)
    if len(history_store) > MAX_HISTORY_ITEMS:
        del history_store[:-MAX_HISTORY_ITEMS]

    latest_snapshot = snapshot
    return snapshot


@router.post("/predict", response_model=PredictionResponse)
async def predict(vital_signs: VitalSignsInput) -> PredictionResponse:
    payload = vital_signs.model_dump()
    payload["timestamp"] = _ensure_timestamp(payload.get("timestamp"))
    logger.info("Received prediction request: %s", payload)

    try:
        result = inference_engine.predict_from_dict(payload) if inference_engine else _fallback_prediction(payload)
        _persist_snapshot(payload, result)
        return PredictionResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Prediction error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {exc}",
        ) from exc


@router.get("/latest-data", response_model=VitalSignsResponse)
async def get_latest_data() -> VitalSignsResponse:
    if latest_snapshot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No data available yet")
    return VitalSignsResponse(**latest_snapshot)


@router.get("/history", response_model=List[VitalSignsResponse])
async def get_history(limit: int = 20) -> List[VitalSignsResponse]:
    if limit < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="limit must be greater than 0")
    return [VitalSignsResponse(**item) for item in history_store[-limit:]]


@router.get("/dashboard", response_model=DashboardSnapshot)
async def get_dashboard(limit: int = 20) -> DashboardSnapshot:
    latest = VitalSignsResponse(**latest_snapshot) if latest_snapshot else None
    history = [VitalSignsResponse(**item) for item in history_store[-limit:]]
    updated_at = latest.timestamp if latest else None
    return DashboardSnapshot(
        latest=latest,
        history=history,
        source="device" if latest else "waiting_for_data",
        model_loaded=inference_engine is not None and inference_engine.model is not None,
        updated_at=updated_at,
    )


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        model_loaded=inference_engine is not None and inference_engine.model is not None,
    )


@router.post("/reset")
async def reset_data() -> Dict[str, str]:
    global latest_snapshot
    history_store.clear()
    latest_snapshot = None
    return {"message": "Data reset successfully", "timestamp": datetime.now().isoformat()}
