from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import httpx
except ImportError:  # pragma: no cover
    httpx = None

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    def load_dotenv(*args, **kwargs):
        return False

try:
    from fastapi import FastAPI, Header, HTTPException, Request, WebSocket, WebSocketDisconnect, status
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse

    FASTAPI_AVAILABLE = True
except ImportError:  # pragma: no cover
    FastAPI = None
    Header = None
    HTTPException = Exception
    Request = None
    WebSocket = None
    WebSocketDisconnect = Exception
    status = None
    CORSMiddleware = None
    JSONResponse = None
    FASTAPI_AVAILABLE = False

# Load .env file from backend directory
_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)

from backend.database import (
    clear_history,
    create_patient,
    get_active_patient,
    get_feedback_summary,
    get_history as db_get_history,
    get_latest as db_get_latest,
    get_patient,
    get_patient_overview,
    init_db,
    list_patients,
    save_feedback,
    set_active_patient,
    update_patient,
    delete_patient,
)

if FASTAPI_AVAILABLE:
    try:
        from backend.routes import predict
    except Exception:  # pragma: no cover
        predict = None
else:
    predict = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

MODEL_PATH = "models/health_model.pkl"
THINGSPEAK_URL = os.getenv("THINGSPEAK_URL", "https://api.thingspeak.com/channels/3144180/feeds.json?results=1")
ADMIN_TOKEN = os.getenv("IHM_ADMIN_TOKEN", "change-me")
DEFAULT_RESPIRATORY_RATE = 16.0


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[Any] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str) -> None:
        stale_connections: list[Any] = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                stale_connections.append(connection)
        for connection in stale_connections:
            self.disconnect(connection)


manager = ConnectionManager()


def _now_iso() -> str:
    return datetime.now().isoformat()


def _model_loaded() -> bool:
    return os.path.exists(MODEL_PATH)


def _telemetry_polling_enabled() -> bool:
    return bool(httpx is not None and THINGSPEAK_URL and predict is not None)


def _health_payload() -> dict[str, Any]:
    return {
        "status": "healthy",
        "timestamp": _now_iso(),
        "version": "2.0.0",
        "model_loaded": bool(predict is not None and getattr(getattr(predict, "inference_engine", None), "model", None) is not None),
        "realtime_status": "connected",
        "telemetry_polling": _telemetry_polling_enabled(),
    }


def _status_payload() -> dict[str, Any]:
    active_patient = get_active_patient()
    return {
        "status": "healthy",
        "model_loaded": _model_loaded(),
        "thingspeak_polling": _telemetry_polling_enabled(),
        "active_patient_id": active_patient["id"] if active_patient else None,
        "active_patient_name": active_patient["name"] if active_patient else None,
        "secured_reset": True,
        "timestamp": _now_iso(),
        "uptime": "N/A",
    }


def _coerce_int(value: str | None) -> int | None:
    if value in (None, ""):
        return None
    return int(value)


def _resolve_patient_id(patient_id: int | None) -> int:
    if patient_id is not None:
        patient = get_patient(patient_id)
        if patient is None:
            raise ValueError("Patient not found")
        return patient["id"]

    active = get_active_patient()
    if active is None:
        raise ValueError("No active patient configured")
    return active["id"]


def _ensure_timestamp(raw_timestamp: str | None) -> str:
    if raw_timestamp:
        try:
            return datetime.fromisoformat(raw_timestamp.replace("Z", "+00:00")).isoformat()
        except ValueError:
            logger.warning("Invalid timestamp received: %s", raw_timestamp)
    return _now_iso()


def _fallback_prediction(data: dict[str, Any]) -> dict[str, Any]:
    hr = float(data["heart_rate"])
    spo2 = float(data["spo2"])
    temp = float(data["body_temperature"]) if data.get("body_temperature") is not None else 36.8
    rr = float(data["respiratory_rate"]) if data.get("respiratory_rate") is not None else DEFAULT_RESPIRATORY_RATE

    if hr < 50 or hr > 120 or spo2 < 90 or temp > 38.5 or temp < 35.0 or rr < 10 or rr > 30:
        prediction = "Risk"
        confidence = 0.82
        probability = {"Normal": 0.10, "Stress": 0.28, "Risk": 0.62}
    elif hr < 60 or hr > 100 or spo2 < 95 or temp > 37.5 or temp < 36.1 or rr < 12 or rr > 20:
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
            "respiratory_rate_estimated": data.get("respiratory_rate") is None,
            "patient_id": data.get("patient_id"),
        },
    }


def _process_vital_signs(
    payload: dict[str, Any],
    *,
    source: str = "manual",
    source_entry_id: str | None = None,
    patient_id: int | None = None,
) -> dict[str, Any]:
    normalized = dict(payload)
    normalized["timestamp"] = _ensure_timestamp(normalized.get("timestamp"))
    normalized["patient_id"] = _resolve_patient_id(patient_id or normalized.get("patient_id"))

    if predict is not None:
        processed = predict.process_vital_signs(
            normalized,
            source=source,
            source_entry_id=source_entry_id,
            patient_id=normalized["patient_id"],
        )
        return {
            "prediction": processed["prediction"].model_dump() if hasattr(processed["prediction"], "model_dump") else processed["prediction"],
            "snapshot": processed["snapshot"].model_dump() if processed.get("snapshot") and hasattr(processed["snapshot"], "model_dump") else processed.get("snapshot"),
            "inserted": processed["inserted"],
        }

    result = _fallback_prediction(normalized)
    try:
        from backend.database import insert_snapshot

        snapshot = insert_snapshot(
            {
                "patient_id": normalized["patient_id"],
                "heart_rate": float(normalized["heart_rate"]),
                "respiratory_rate": None if normalized.get("respiratory_rate") is None else float(normalized["respiratory_rate"]),
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
        )
    except Exception:
        snapshot = None

    return {
        "prediction": result,
        "snapshot": snapshot,
        "inserted": snapshot is not None,
    }


def _dashboard_payload(patient_id: int | None, limit: int) -> dict[str, Any]:
    target_patient_id = _resolve_patient_id(patient_id)
    patient = get_patient(target_patient_id)
    latest_snapshot = db_get_latest(target_patient_id)
    history = db_get_history(limit, target_patient_id)
    updated_at = latest_snapshot["timestamp"] if latest_snapshot else None
    return {
        "patient": patient,
        "latest": latest_snapshot,
        "history": history,
        "source": "device" if latest_snapshot else "waiting_for_data",
        "model_loaded": bool(predict is not None and getattr(getattr(predict, "inference_engine", None), "model", None) is not None),
        "updated_at": updated_at,
        "monitoring_patient_id": target_patient_id,
        "feedback_summary": get_feedback_summary(target_patient_id),
    }


def _root_payload() -> dict[str, Any]:
    active_patient = get_active_patient()
    return {
        "service": "IoT Health Monitor API",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs" if FASTAPI_AVAILABLE else None,
        "active_patient": active_patient["name"] if active_patient else None,
        "timestamp": _now_iso(),
    }


async def fetch_thingspeak_data() -> None:
    if not _telemetry_polling_enabled():
        logger.warning("ThingSpeak polling is disabled.")
        return

    while True:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(THINGSPEAK_URL)
                response.raise_for_status()
                data = response.json()
                feeds = data.get("feeds") or []
                if feeds:
                    latest_feed = feeds[0]
                    hr = float(latest_feed.get("field1") or 0)
                    spo2 = float(latest_feed.get("field2") or 0)
                    temp = float(latest_feed.get("field3") or 0)
                    gsr = float(latest_feed.get("field4") or 0)
                    entry_id = latest_feed.get("entry_id")
                    active_patient = get_active_patient()

                    if 30 < hr < 250 and 70 < spo2 <= 100 and active_patient is not None:
                        processed = _process_vital_signs(
                            {
                                "heart_rate": hr,
                                "spo2": spo2,
                                "body_temperature": temp if 35.0 <= temp <= 42.0 else None,
                                "gsr": gsr if gsr > 0 else None,
                                "timestamp": latest_feed.get("created_at"),
                                "patient_id": active_patient["id"],
                            },
                            source="thingspeak",
                            source_entry_id=str(entry_id) if entry_id is not None else None,
                            patient_id=active_patient["id"],
                        )
                        if processed["inserted"] and FASTAPI_AVAILABLE:
                            await manager.broadcast("NEW_DATA")
        except Exception as exc:
            logger.error("Error fetching ThingSpeak data: %s", exc)

        await asyncio.sleep(15)


def _read_json_body(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    content_length = int(handler.headers.get("Content-Length", "0") or 0)
    if content_length <= 0:
        return {}
    raw = handler.rfile.read(content_length)
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8"))


class FallbackApiHandler(BaseHTTPRequestHandler):
    server_version = "IoTHealthMonitorFallback/1.0"

    def _send_json(self, payload: dict[str, Any] | list[Any], status_code: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,x-admin-token")
        self.end_headers()
        self.wfile.write(body)

    def _send_error(self, status_code: int, message: str) -> None:
        self._send_json({"detail": message, "timestamp": _now_iso()}, status_code)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,x-admin-token")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            patient_id = _coerce_int(params.get("patient_id", [None])[0])
            limit = _coerce_int(params.get("limit", ["20"])[0]) or 20

            if parsed.path == "/":
                self._send_json(_root_payload())
            elif parsed.path == "/status":
                self._send_json(_status_payload())
            elif parsed.path == "/api/v1/health":
                self._send_json(_health_payload())
            elif parsed.path == "/api/v1/patients":
                patients = list_patients()
                active = next((patient["id"] for patient in patients if patient["active"]), None)
                self._send_json({"patients": patients, "active_patient_id": active})
            elif parsed.path == "/api/v1/patients/overview":
                self._send_json({"patients": get_patient_overview()})
            elif parsed.path == "/api/v1/dashboard":
                self._send_json(_dashboard_payload(patient_id, limit))
            elif parsed.path == "/api/v1/latest-data":
                target_patient_id = _resolve_patient_id(patient_id)
                latest = db_get_latest(target_patient_id)
                if latest is None:
                    self._send_error(404, "No data available yet")
                else:
                    self._send_json(latest)
            elif parsed.path == "/api/v1/history":
                target_patient_id = _resolve_patient_id(patient_id)
                self._send_json(db_get_history(limit, target_patient_id))
            else:
                self._send_error(404, "Route not found")
        except ValueError as exc:
            self._send_error(400, str(exc))
        except Exception as exc:
            logger.exception("Fallback GET error")
            self._send_error(500, str(exc))

    def do_POST(self) -> None:  # noqa: N802
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            body = _read_json_body(self)

            if parsed.path == "/api/v1/patients":
                created = create_patient(body)
                self._send_json(created, 201)
                return

            if parsed.path.startswith("/api/v1/patients/") and parsed.path.endswith("/activate"):
                patient_id = int(parsed.path.strip("/").split("/")[3])
                patient = set_active_patient(patient_id)
                if patient is None:
                    self._send_error(404, "Patient not found")
                else:
                    self._send_json(patient)
                return

            if parsed.path == "/api/v1/feedback":
                target_patient_id = _resolve_patient_id(body.get("patient_id"))
                saved = save_feedback(
                    {
                        "patient_id": target_patient_id,
                        "snapshot_id": body.get("snapshot_id"),
                        "accurate": body.get("accurate"),
                        "prediction": body.get("prediction"),
                        "metrics": body.get("metrics", {}),
                        "notes": body.get("notes"),
                    }
                )
                self._send_json(saved)
                return

            if parsed.path == "/api/v1/reset":
                if self.headers.get("x-admin-token") != ADMIN_TOKEN:
                    self._send_error(401, "Admin token required for this operation")
                    return
                patient_id = _coerce_int(params.get("patient_id", [None])[0])
                target_patient_id = _resolve_patient_id(patient_id) if patient_id is not None else None
                deleted = clear_history(target_patient_id)
                self._send_json(
                    {
                        "message": "Data reset successfully",
                        "timestamp": _now_iso(),
                        "deleted_records": deleted,
                        "patient_id": target_patient_id,
                    }
                )
                return

            if parsed.path == "/api/v1/predict":
                self._send_json(_process_vital_signs(body)["prediction"])
                return

            self._send_error(404, "Route not found")
        except ValueError as exc:
            self._send_error(400, str(exc))
        except Exception as exc:
            logger.exception("Fallback POST error")
            self._send_error(500, str(exc))

    def do_PATCH(self) -> None:  # noqa: N802
        try:
            parsed = urlparse(self.path)
            body = _read_json_body(self)
            if parsed.path.startswith("/api/v1/patients/"):
                patient_id = int(parsed.path.strip("/").split("/")[3])
                updated = update_patient(patient_id, body)
                if updated is None:
                    self._send_error(404, "Patient not found")
                else:
                    self._send_json(updated)
                return
            self._send_error(404, "Route not found")
        except ValueError as exc:
            self._send_error(400, str(exc))
        except Exception as exc:
            logger.exception("Fallback PATCH error")
            self._send_error(500, str(exc))

    def do_DELETE(self) -> None:  # noqa: N802
        try:
            parsed = urlparse(self.path)
            if parsed.path.startswith("/api/v1/patients/"):
                patient_id = int(parsed.path.strip("/").split("/")[3])
                success = delete_patient(patient_id)
                if not success:
                    self._send_error(404, "Patient not found")
                else:
                    self._send_json({"message": "Patient deleted successfully"})
                return
            self._send_error(404, "Route not found")
        except ValueError as exc:
            self._send_error(400, str(exc))
        except Exception as exc:
            logger.exception("Fallback DELETE error")
            self._send_error(500, str(exc))

    def log_message(self, format: str, *args: Any) -> None:
        logger.info("Fallback server: " + format, *args)


def run_fallback_server() -> None:
    init_db()
    host = os.getenv("IHM_HOST", "127.0.0.1")
    port = int(os.getenv("IHM_PORT", "8000"))
    server = ThreadingHTTPServer((host, port), FallbackApiHandler)
    logger.warning("FastAPI/uvicorn dependencies unavailable. Running fallback HTTP server on %s:%s", host, port)
    server.serve_forever()


if FASTAPI_AVAILABLE and predict is not None:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logger.info("=" * 50)
        logger.info("Starting IoT Health Monitor API")
        logger.info("=" * 50)

        init_db()

        if _model_loaded():
            logger.info("ML model found at %s", MODEL_PATH)
        else:
            logger.warning("ML model not found at %s. Using rule-based fallback.", MODEL_PATH)

        task = None
        if THINGSPEAK_URL:
            task = asyncio.create_task(fetch_thingspeak_data())
        else:
            logger.warning("ThingSpeak polling disabled because THINGSPEAK_URL is empty.")
        yield
        if task is not None:
            task.cancel()
        logger.info("Shutting down IoT Health Monitor API")


    app = FastAPI(
        title="IoT Health Monitor API",
        description="Real-time patient monitoring system with patient-aware telemetry and ML inference",
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    _cors_origins_raw = os.getenv("IHM_CORS_ORIGINS", "")
    _cors_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()] if _cors_origins_raw else []
    _allow_all = os.getenv("IHM_ALLOW_ALL_ORIGINS", "false").lower() == "true"

    if _allow_all:
        cors_kwargs: dict[str, Any] = {
            "allow_origins": ["*"],
            "allow_credentials": False,
            "allow_methods": ["*"],
            "allow_headers": ["*"],
        }
    else:
        default_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        cors_kwargs = {
            "allow_origins": list(dict.fromkeys(_cors_origins + default_origins)),
            "allow_credentials": False,
            "allow_methods": ["*"],
            "allow_headers": ["*"],
        }

    app.add_middleware(CORSMiddleware, **cors_kwargs)

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = datetime.now()
        logger.info("Request: %s %s", request.method, request.url.path)

        try:
            response = await call_next(request)
            process_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.info("Response: %s (%.2fms)", response.status_code, process_time)
            return response
        except Exception as exc:
            process_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.error("Error: %s (%.2fms)", str(exc), process_time)
            return JSONResponse(
                status_code=500,
                content={"error": str(exc), "timestamp": _now_iso()},
            )

    app.include_router(predict.router, prefix="/api/v1", tags=["Prediction"])

    @app.get("/")
    async def root():
        return _root_payload()

    @app.get("/status")
    async def status_route():
        return _status_payload()

    @app.delete("/api/v1/patients/{patient_id}")
    async def delete_patient_route(patient_id: int):
        success = delete_patient(patient_id)
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )
        return {"message": "Patient deleted successfully"}

    @app.post("/api/v1/reset")
    async def protected_reset(
        patient_id: int | None = None,
        x_admin_token: str | None = Header(default=None),
    ):
        if x_admin_token != ADMIN_TOKEN:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Admin token required for this operation",
            )
        return await predict.reset_data(patient_id)

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await manager.connect(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)
else:
    app = None


if __name__ == "__main__":
    if app is not None:
        import uvicorn

        uvicorn.run(
            "backend.main:app",
            host=os.getenv("IHM_HOST", "0.0.0.0"),
            port=int(os.getenv("IHM_PORT", "8000")),
            reload=True,
            log_level="info",
        )
    else:
        run_fallback_server()
