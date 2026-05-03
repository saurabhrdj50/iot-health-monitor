# IoT Health Monitor

Patient-aware IoT monitoring stack built with:

- ESP8266 firmware streaming vitals to ThingSpeak
- FastAPI backend for ingestion, storage, ML inference, and clinician feedback
- React dashboard for live telemetry, patient assignment, alerts, and exports

## What Changed

- Live readings are now stored against a real `patient_id`
- Feedback is persisted in SQLite instead of only being logged
- ThingSpeak ingestion is deduplicated by feed `entry_id`
- Reset operations require `IHM_ADMIN_TOKEN`
- The dashboard now supports patient activation, patient admission, richer alerting, and animated telemetry views

## Project Structure

```text
iot-health-monitor/
|-- arduino/
|   `-- health_monitor/
|       `-- thingspeak_ml_enhanced/
|           |-- thingspeak_ml_enhanced.ino
|           `-- secrets.h
|-- backend/
|   |-- main.py
|   |-- database.py
|   |-- models/
|   |   `-- schemas.py
|   `-- routes/
|       `-- predict.py
|-- data/
|   |-- human_vital_signs_dataset_2024.csv
|   `-- telemetry.db
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- App.js
|   |   |-- index.css
|   |   `-- index.js
|   `-- package.json
|-- ml/
|   |-- inference_engine.py
|   |-- preprocessing.py
|   `-- training_pipeline.py
|-- models/
|   |-- health_model.pkl
|   |-- model_config.json
|   `-- scaler.pkl
|-- HARDWARE_GUIDE.md
|-- START.md
`-- requirements.txt
```

## Backend Setup

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Train the ML model if needed:

```powershell
.\.venv\Scripts\python.exe -m ml.training_pipeline
```

Run the API:

```powershell
$env:IHM_ADMIN_TOKEN="change-this-token"
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Useful endpoints:

- `GET /status`
- `GET /api/v1/patients`
- `POST /api/v1/patients`
- `POST /api/v1/patients/{id}/activate`
- `GET /api/v1/dashboard?patient_id=1`
- `POST /api/v1/predict`
- `POST /api/v1/feedback`
- `POST /api/v1/reset?patient_id=1` with header `x-admin-token`

## Frontend Setup

```powershell
cd frontend
npm install
$env:REACT_APP_API_URL="http://127.0.0.1:8000"
npm start
```

The local frontend config is stored in [frontend/.env.local](/C:/Users/gupta/Desktop/iot-health-monitor/frontend/.env.local:1).

Production build:

```powershell
cd frontend
npm run build
```

## Arduino Setup

Edit [secrets.h](/C:/Users/gupta/Desktop/iot-health-monitor/arduino/health_monitor/thingspeak_ml_enhanced/secrets.h) with your WiFi and ThingSpeak values, then upload [thingspeak_ml_enhanced.ino](/C:/Users/gupta/Desktop/iot-health-monitor/arduino/health_monitor/thingspeak_ml_enhanced/thingspeak_ml_enhanced.ino).

ThingSpeak field mapping:

- `field1`: heart rate
- `field2`: SpO2
- `field3`: body temperature
- `field4`: GSR
- `field5`: stress score

## Notes

- Existing historical rows are auto-assigned to the currently active patient during DB initialization.
- The default reset token is `change-me` until you set `IHM_ADMIN_TOKEN`.
- Hardware instructions live in [HARDWARE_GUIDE.md](/C:/Users/gupta/Desktop/iot-health-monitor/HARDWARE_GUIDE.md).
