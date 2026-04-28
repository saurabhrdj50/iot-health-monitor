# 🚀 How to Start the Full Project

> Step-by-step guide to get the **IoT Health Monitor** running end-to-end:  
> **ESP8266 firmware → FastAPI backend → ML model → React dashboard**

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Python | 3.10+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Arduino IDE | 2.x | [Download](https://www.arduino.cc/en/software) |
| Git | any | `git --version` |

---

## Quick Start (4 terminals)

```
Terminal 1  →  Train ML model
Terminal 2  →  Start backend API
Terminal 3  →  Start frontend dashboard
Terminal 4  →  Arduino IDE (upload firmware)
```

---

## Step 1 — Clone & Setup Python Environment

```powershell
cd C:\Users\gupta\Desktop\iot-health-monitor

# Create virtual environment (skip if .venv already exists)
python -m venv .venv

# Activate it
.\.venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

---

## Step 2 — Train the ML Model

> This generates `models/health_model.pkl`, `models/scaler.pkl`, and `models/model_config.json`.  
> **Only needed once** (or whenever you update the training data).

```powershell
# Make sure .venv is active
.\.venv\Scripts\python.exe -m ml.training_pipeline
```

**Expected output:**
```
Training pipeline started...
Loaded dataset: X rows
Model accuracy: ~XX%
Artifacts saved to models/
```

**Verify:**
```powershell
dir models\
```
You should see `health_model.pkl`, `scaler.pkl`, and `model_config.json`.

---

## Step 3 — Start the Backend API

```powershell
# Make sure .venv is active
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

**Verify it's running:**
```powershell
# In a new terminal
curl http://127.0.0.1:8000/status
```

**Expected response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "timestamp": "2026-04-28T..."
}
```

**Useful URLs:**
| URL | Purpose |
|-----|---------|
| http://127.0.0.1:8000/docs | Swagger API documentation |
| http://127.0.0.1:8000/status | Health check |
| http://127.0.0.1:8000/api/v1/health | Detailed health endpoint |

> ⚠️ Keep this terminal running. The backend must stay alive for the dashboard and ESP8266.

---

## Step 4 — Start the Frontend Dashboard

```powershell
cd frontend

# Install Node dependencies (first time only)
npm install

# Start the React dev server
npm start
```

**Dashboard opens at:** [http://localhost:3000](http://localhost:3000)

The dashboard will show "Waiting for data" until the ESP8266 starts sending readings (or you send test data manually).

> ⚠️ Keep this terminal running too.

---

## Step 5 — Upload Arduino Firmware

### 5a. Arduino IDE Setup (first time only)

1. **Add ESP8266 board URL** — *File → Preferences → Additional Board Manager URLs*:
   ```
   https://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```

2. **Install board package** — *Tools → Board → Board Manager* → search `ESP8266` → install **esp8266 by ESP8266 Community**

3. **Install libraries** — *Sketch → Include Library → Manage Libraries*:
   - Search `SparkFun MAX3010x` → install
   - Search `OneWire` → install
   - Search `DallasTemperature` → install

### 5b. Configure the Firmware

Open `arduino/health_monitor/health_monitor.ino` and update:

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";       // ← Your WiFi name
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";   // ← Your WiFi password
const char* SERVER_URL     = "http://192.168.X.X:8000/api/v1/predict";  // ← Your PC's local IP
```

**Find your PC's IP:**
```powershell
ipconfig
```
Look for `IPv4 Address` under your active WiFi/Ethernet adapter (e.g., `192.168.1.6`).

### 5c. Wire the Sensors

| Sensor | → ESP8266 Pin |
|--------|---------------|
| MAX30102 SDA | D2 |
| MAX30102 SCL | D1 |
| DS18B20 DATA | D4 (+ 4.7kΩ pull-up to 3.3V) |
| GSR SIG | A0 |
| All VCC | 3.3V |
| All GND | GND |

> 📖 See [`HARDWARE_GUIDE.md`](HARDWARE_GUIDE.md) for detailed wiring diagrams.

### 5d. Upload & Monitor

1. Select board: *Tools → Board → NodeMCU 1.0 (ESP-12E Module)*
2. Select port: *Tools → Port → (your COM port)*
3. Click **Upload** (→ arrow button)
4. Open *Tools → Serial Monitor* → set baud to **115200**

**Expected serial output:**
```
====================================
  IoT Health Monitor — Booting...
====================================

✔ MAX30102 detected
✔ DS18B20 found (1 device(s))
✔ GSR sensor ready on A0
✔ WiFi connected — IP: 192.168.1.42
```

---

## Step 6 — Verify End-to-End

Once all components are running:

1. **Place your finger** firmly on the MAX30102 sensor
2. **Watch the Serial Monitor** — heart rate and SpO2 should appear
3. **Check the backend** — you should see `POST /api/v1/predict` logs
4. **Open the dashboard** at http://localhost:3000 — live data should populate

---

## Testing Without Hardware

You can send mock sensor data to the backend to test the dashboard:

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/predict `
  -H "Content-Type: application/json" `
  -d "{\"heart_rate\":78,\"respiratory_rate\":16,\"body_temperature\":36.8,\"spo2\":97,\"gsr\":410000,\"timestamp\":\"2026-04-28T17:00:00\"}"
```

Run this a few times with different values to populate the trend charts.

---

## Stopping Everything

| Component | How to Stop |
|-----------|-------------|
| Backend | `Ctrl+C` in the backend terminal |
| Frontend | `Ctrl+C` in the frontend terminal |
| Arduino | Disconnect USB or close Serial Monitor |

---

## Project Structure at a Glance

```
iot-health-monitor/
├── arduino/
│   ├── health_monitor/
│   │   └── health_monitor.ino    ← ESP8266 firmware
│   └── i2c_scanner/
│       └── i2c_scanner.ino       ← Diagnostic tool
├── backend/
│   ├── main.py                   ← FastAPI app entry point
│   ├── models/schemas.py         ← Pydantic schemas
│   └── routes/predict.py         ← API endpoints
├── frontend/
│   └── src/App.js                ← React dashboard
├── ml/
│   ├── training_pipeline.py      ← Model training script
│   ├── preprocessing.py          ← Feature engineering
│   └── inference_engine.py       ← Runtime inference
├── models/                       ← Trained ML artifacts
├── data/                         ← Training dataset
├── requirements.txt              ← Python deps
├── HARDWARE_GUIDE.md             ← Full wiring & troubleshooting
├── START.md                      ← This file
└── README.md                     ← Project overview
```

---

## Common Issues

| Problem | Quick Fix |
|---------|-----------|
| `pip` not found | Use `.\.venv\Scripts\pip.exe` or install Python with "Add to PATH" |
| Backend port 8000 in use | Change port: `--port 8001` and update `SERVER_URL` in Arduino |
| Frontend can't reach backend | Set `REACT_APP_API_URL=http://127.0.0.1:8000` before `npm start` |
| ESP8266 not posting data | Check WiFi credentials and `SERVER_URL` IP matches your PC |
| `model not found` warning | Run Step 2 (training pipeline) first |
| Serial Monitor shows gibberish | Set baud rate to **115200** |
| COM port not visible | Try a different USB cable (some are charge-only) |

---

> 💡 **Tip:** For the best experience, start the components in this order:  
> **ML training → Backend → Frontend → Arduino upload**
