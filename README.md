# IoT Health Monitor

Portfolio-grade IoT + ML health monitoring stack with:

- ESP8266 firmware for real-time vitals capture
- FastAPI backend for ingestion and inference
- Shared ML preprocessing for training and runtime consistency
- React + Tailwind operations dashboard for live monitoring

## Architecture

`ESP8266 -> FastAPI -> ML inference -> dashboard`

## Project Structure

```text
iot-health-monitor/
|-- arduino/
|   `-- health_monitor/
|       `-- health_monitor.ino
|-- backend/
|   |-- main.py
|   |-- models/
|   |   |-- __init__.py
|   |   `-- schemas.py
|   `-- routes/
|       |-- __init__.py
|       `-- predict.py
|-- data/
|   `-- human_vital_signs_dataset_2024.csv
|-- frontend/
|   |-- public/
|   |   `-- index.html
|   |-- src/
|   |   |-- App.js
|   |   |-- index.css
|   |   `-- index.js
|   |-- package.json
|   |-- postcss.config.js
|   `-- tailwind.config.js
|-- ml/
|   |-- __init__.py
|   |-- inference_engine.py
|   |-- preprocessing.py
|   `-- training_pipeline.py
|-- models/
|   |-- health_model.pkl
|   |-- model_config.json
|   `-- scaler.pkl
|-- requirements.txt
`-- README.md
```

## Backend Setup

Create the local virtual environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

If `python` is not on PATH, use the installed Python launcher or your local Python executable.

## ML Setup

Train the model and generate artifacts:

```powershell
.\.venv\Scripts\python.exe -m ml.training_pipeline
```

Artifacts are written to `models/`.

## Backend Run Command

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Health check:

```powershell
curl http://127.0.0.1:8000/status
```

## Frontend Setup

```powershell
cd frontend
npm install
```

Optional API target override:

```powershell
$env:REACT_APP_API_URL="http://127.0.0.1:8000"
```

## Frontend Run Command

```powershell
cd frontend
npm start
```

The development dashboard runs on `http://127.0.0.1:3000`.

## API Endpoints

- `POST /api/v1/predict`
- `GET /api/v1/latest-data`
- `GET /api/v1/history?limit=20`
- `GET /api/v1/dashboard?limit=24`
- `GET /api/v1/health`
- `POST /api/v1/reset`

## Sample Prediction Request

```json
{
  "heart_rate": 88,
  "respiratory_rate": 18,
  "body_temperature": 37.1,
  "spo2": 96,
  "gsr": 410000,
  "timestamp": "2026-04-28T14:30:00"
}
```

## Example curl Requests

Prediction:

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/predict `
  -H "Content-Type: application/json" `
  -d "{\"heart_rate\":88,\"respiratory_rate\":18,\"body_temperature\":37.1,\"spo2\":96,\"gsr\":410000,\"timestamp\":\"2026-04-28T14:30:00\"}"
```

Dashboard snapshot:

```powershell
curl http://127.0.0.1:8000/api/v1/dashboard?limit=10
```

Reset live cache:

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/reset
```

## Arduino Setup

> **Full hardware guide:** See [`HARDWARE_GUIDE.md`](HARDWARE_GUIDE.md) for complete wiring
> diagrams, voltage notes, library installation, and troubleshooting.

### Required Libraries

| Library | Install Search Term |
|---|---|
| SparkFun MAX3010x | `SparkFun MAX3010x` |
| OneWire | `OneWire` |
| DallasTemperature | `DallasTemperature` |

### Configuration

Update WiFi and backend settings in `arduino/health_monitor/health_monitor.ino`:

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL     = "http://YOUR_BACKEND_IP:8000/api/v1/predict";
```

### Wiring Summary

| Sensor | ESP8266 Pin | Protocol |
|---|---|---|
| MAX30102 SDA | D2 (GPIO4) | I2C |
| MAX30102 SCL | D1 (GPIO5) | I2C |
| DS18B20 DATA | D4 (GPIO2) | OneWire (+ 4.7kΩ pull-up to 3.3V) |
| GSR SIG | A0 | Analog |
| All VCC | 3.3V | — |
| All GND | GND | — |

### Firmware Features

- **SparkFun MAX3010x** library with proper peak-detection heart rate algorithm
- Non-blocking DS18B20 temperature reads (no 750ms blocking delay)
- 10-sample averaged GSR with exponential smoothing
- Watchdog-safe (yield() in all tight loops)
- Formatted serial dashboard with sensor status indicators
- Auto WiFi reconnection with cooldown timer
- Serial baud rate: **115200**

### JSON Payload (sent to backend)

```json
{
  "heart_rate": 78.4,
  "respiratory_rate": 16.0,
  "body_temperature": 36.72,
  "spo2": 97.0,
  "gsr": 342500,
  "timestamp": "12345"
}
```

The backend normalizes the timestamp if the device sends a non-ISO value.

## Notes on ML Labels

The source dataset only contains two native categories (`Low Risk` and `High Risk`). The runtime stack still exposes three operational states:

- `Normal` and `Stress` from the trained model
- `Risk` from explicit inference-time escalation rules for critical live readings

This preserves real-time alerting without letting training-time preprocessing drift from inference-time preprocessing.
