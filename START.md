# How To Start The Project

## Prerequisites

- Python 3.12
- Node.js 18+ and npm

## Quick Start

### Step 1: Set Up Python Backend

Open PowerShell and run:

```powershell
cd C:\Users\gupta\Desktop\iot-health-monitor

# Create and activate virtual environment
py -3.12 -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Train ML Model (required first time only)

```powershell
.\.venv\Scripts\python.exe -m ml.training_pipeline
```

This creates the model files in `models/`:
- `health_model.pkl`
- `scaler.pkl`
- `model_config.json`

### Step 3: Start Backend

```powershell
$env:IHM_ADMIN_TOKEN="bhjsy572877tb_YH8u87_678bu"
.\.venv\Scripts\python.exe -m backend.main
```

Verify it works:
```powershell
curl http://localhost:8000/status
```

### Step 4: Start Frontend

Open a **new PowerShell window** and run:

```powershell
cd C:\Users\gupta\Desktop\iot-health-monitor\frontend

# Install dependencies (first time only)
npm install

# Start the dev server
npm start
```

The dashboard opens at: **http://localhost:3000**

## Run Order (every session)

1. **Terminal 1**: Start backend
2. **Terminal 2**: Start frontend
3. Dashboard loads at `http://localhost:3000`

## Optional: Arduino Device

To stream real sensor data, upload the sketch in `arduino/health_monitor/thingspeak_ml_enhanced/` to your ESP8266 after configuring WiFi credentials in `secrets.h`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 8000 in use | Kill the process or set `$env:IHM_PORT="8001"` |
| Port 3000 in use | React will prompt to use another port |
| Module not found | Re-run `pip install -r requirements.txt` |
| `npm install` fails | Delete `frontend/node_modules` and `package-lock.json`, then retry |
| ML model missing | Run Step 2 (training pipeline) |
