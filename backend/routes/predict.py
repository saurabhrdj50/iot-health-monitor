from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status

from backend.database import (
    clear_history,
    create_patient,
    get_active_patient,
    get_feedback_summary,
    get_history as db_get_history,
    get_latest as db_get_latest,
    get_patient,
    get_patient_overview,
    insert_snapshot,
    list_patients,
    save_feedback,
    set_active_patient,
    update_patient,
)
from backend.models.schemas import (
    DashboardSnapshot,
    FeedbackInput,
    FeedbackResponse,
    HealthResponse,
    PatientCreate,
    PatientDirectoryResponse,
    PatientOverviewResponse,
    PatientSummary,
    PatientUpdate,
    PredictionResponse,
    VitalSignsInput,
    VitalSignsResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)

DEFAULT_BODY_TEMPERATURE = 36.8
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
            "patient_id": data.get("patient_id"),
        },
    }


def _resolve_patient_id(patient_id: Optional[int]) -> int:
    if patient_id is not None:
        patient = get_patient(patient_id)
        if patient is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        return patient["id"]

    active = get_active_patient()
    if active is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No active patient configured")
    return active["id"]


def process_vital_signs(
    payload: Dict[str, Any],
    *,
    source: str = "manual",
    source_entry_id: Optional[str] = None,
    patient_id: Optional[int] = None,
) -> Dict[str, Any]:
    normalized = dict(payload)
    normalized["timestamp"] = _ensure_timestamp(normalized.get("timestamp"))
    normalized["patient_id"] = _resolve_patient_id(patient_id or normalized.get("patient_id"))
    logger.info("Processing vitals for patient %s via %s", normalized["patient_id"], source)

    result = inference_engine.predict_from_dict(normalized) if inference_engine else _fallback_prediction(normalized)
    snapshot = {
        "patient_id": normalized["patient_id"],
        "heart_rate": float(normalized["heart_rate"]),
        "respiratory_rate": float(normalized["respiratory_rate"]),
        "body_temperature": None if normalized.get("body_temperature") is None else float(normalized["body_temperature"]),
        "spo2": float(normalized["spo2"]),
        "gsr": None if normalized.get("gsr") is None else float(normalized["gsr"]),
        "timestamp": normalized["timestamp"],
        "prediction": result["prediction"],
        "confidence_score": float(result["confidence_score"]),
        "anomaly_flag": bool(result["anomaly_flag"]),
        "probability": result["probability"],
        "source": source,
        "source_entry_id": source_entry_id,
    }

    persisted = insert_snapshot(snapshot)
    return {
        "prediction": PredictionResponse(**result),
        "snapshot": VitalSignsResponse(**persisted) if persisted else None,
        "inserted": persisted is not None,
    }


@router.post("/predict", response_model=PredictionResponse)
async def predict(vital_signs: VitalSignsInput) -> PredictionResponse:
    try:
        processed = process_vital_signs(vital_signs.model_dump(), source="manual")
        return processed["prediction"]
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Prediction error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {exc}",
        ) from exc


@router.get("/patients", response_model=PatientDirectoryResponse)
async def get_patients() -> PatientDirectoryResponse:
    patients = [PatientSummary(**item) for item in list_patients()]
    active = next((patient.id for patient in patients if patient.active), None)
    return PatientDirectoryResponse(patients=patients, active_patient_id=active)


@router.get("/patients/overview", response_model=PatientOverviewResponse)
async def get_patients_overview() -> PatientOverviewResponse:
    return PatientOverviewResponse(patients=get_patient_overview())


@router.post("/patients", response_model=PatientSummary, status_code=status.HTTP_201_CREATED)
async def admit_patient(payload: PatientCreate) -> PatientSummary:
    return PatientSummary(**create_patient(payload.model_dump()))


@router.patch("/patients/{patient_id}", response_model=PatientSummary)
async def patch_patient(patient_id: int, payload: PatientUpdate) -> PatientSummary:
    patient = update_patient(patient_id, payload.model_dump(exclude_none=True))
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return PatientSummary(**patient)


@router.post("/patients/{patient_id}/activate", response_model=PatientSummary)
async def activate_patient(patient_id: int) -> PatientSummary:
    patient = set_active_patient(patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return PatientSummary(**patient)


@router.get("/latest-data", response_model=VitalSignsResponse)
async def get_latest_data(patient_id: Optional[int] = None) -> VitalSignsResponse:
    target_patient_id = _resolve_patient_id(patient_id)
    latest_snapshot = db_get_latest(target_patient_id)
    if latest_snapshot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No data available yet")
    return VitalSignsResponse(**latest_snapshot)


@router.get("/history", response_model=List[VitalSignsResponse])
async def get_history(limit: int = 20, patient_id: Optional[int] = None) -> List[VitalSignsResponse]:
    if limit < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="limit must be greater than 0")
    target_patient_id = _resolve_patient_id(patient_id)
    return [VitalSignsResponse(**item) for item in db_get_history(limit, target_patient_id)]


@router.get("/dashboard", response_model=DashboardSnapshot)
async def get_dashboard(limit: int = 20, patient_id: Optional[int] = None) -> DashboardSnapshot:
    target_patient_id = _resolve_patient_id(patient_id)
    patient = get_patient(target_patient_id)
    latest_snapshot = db_get_latest(target_patient_id)
    latest = VitalSignsResponse(**latest_snapshot) if latest_snapshot else None
    history = [VitalSignsResponse(**item) for item in db_get_history(limit, target_patient_id)]
    updated_at = latest.timestamp if latest else None
    return DashboardSnapshot(
        patient=PatientSummary(**patient) if patient else None,
        latest=latest,
        history=history,
        source="device" if latest else "waiting_for_data",
        model_loaded=inference_engine is not None and inference_engine.model is not None,
        updated_at=updated_at,
        monitoring_patient_id=target_patient_id,
        feedback_summary=get_feedback_summary(target_patient_id),
    )


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="2.0.0",
        model_loaded=inference_engine is not None and inference_engine.model is not None,
    )


@router.post("/feedback", response_model=FeedbackResponse)
async def receive_feedback(payload: FeedbackInput) -> FeedbackResponse:
    target_patient_id = _resolve_patient_id(payload.patient_id)
    saved = save_feedback(
        {
            "patient_id": target_patient_id,
            "snapshot_id": payload.snapshot_id,
            "accurate": payload.accurate,
            "prediction": payload.prediction,
            "metrics": payload.metrics,
            "notes": payload.notes,
        }
    )
    logger.info("Stored ML feedback for patient %s", target_patient_id)
    return FeedbackResponse(**saved)


async def reset_data(patient_id: Optional[int] = None) -> Dict[str, Any]:
    target_patient_id = _resolve_patient_id(patient_id) if patient_id is not None else None
    deleted = clear_history(target_patient_id)
    return {
        "message": "Data reset successfully",
        "timestamp": datetime.now().isoformat(),
        "deleted_records": deleted,
        "patient_id": target_patient_id,
    }
