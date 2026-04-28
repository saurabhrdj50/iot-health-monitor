# IoT Health Monitor — Hardware & Firmware Reference

> Complete wiring, library setup, code walkthrough, and troubleshooting for the
> ESP8266 + MAX30102 + DS18B20 + GSR sensor stack.

---

## Table of Contents

1. [Component List](#1-component-list)
2. [Wiring Connections](#2-wiring-connections)
3. [Voltage & Power](#3-voltage--power)
4. [Required Libraries](#4-required-libraries)
5. [Arduino IDE / Board Setup](#5-arduino-ide--board-setup)
6. [Firmware Architecture](#6-firmware-architecture)
7. [Configuration](#7-configuration)
8. [Serial Monitor Output](#8-serial-monitor-output)
9. [Backend Integration](#9-backend-integration)
10. [Troubleshooting](#10-troubleshooting)
11. [Quick-Start Checklist](#11-quick-start-checklist)

---

## 1. Component List

| #  | Component                          | Qty | Purpose                      |
|----|------------------------------------|-----|------------------------------|
| 1  | ESP8266 NodeMCU (ESP-12E)          | 1   | Microcontroller + WiFi       |
| 2  | MAX30102 Pulse Oximeter Module     | 1   | Heart rate (BPM) + SpO2 (%)  |
| 3  | DS18B20 Waterproof Temp Sensor     | 1   | Body temperature (°C)        |
| 4  | GSR Sensor Module                  | 1   | Galvanic Skin Response       |
| 5  | 4.7 kΩ Resistor (¼W)              | 1   | Pull-up for DS18B20 data line|
| 6  | Breadboard + Jumper Wires          | 1   | Prototyping connections      |
| 7  | Micro-USB Cable (data-capable!)    | 1   | Power + serial programming   |

---

## 2. Wiring Connections

### Pin-Level Table

| Sensor       | Sensor Pin     | ESP8266 Pin | GPIO  | Wire Colour (typical) |
|-------------|----------------|-------------|-------|-----------------------|
| **MAX30102** | SDA            | **D2**      | GPIO4 | Blue / White          |
|              | SCL            | **D1**      | GPIO5 | Yellow / Green        |
|              | VIN            | **3.3V**    | —     | Red                   |
|              | GND            | **GND**     | —     | Black                 |
| **DS18B20**  | DATA (Yellow)  | **D4**      | GPIO2 | Yellow                |
|              | VCC (Red)      | **3.3V**    | —     | Red                   |
|              | GND (Black)    | **GND**     | —     | Black                 |
|              | Pull-up 4.7kΩ  | DATA ↔ VCC  | —     | *(between DATA & 3.3V)* |
| **GSR**      | SIG            | **A0**      | ADC0  | White / Blue          |
|              | VCC            | **3.3V**    | —     | Red                   |
|              | GND            | **GND**     | —     | Black                 |

### Schematic (ASCII)

```
                         ESP8266 NodeMCU
                    ┌──────────────────────┐
                    │                      │
  ┌─ MAX30102 ──┐   │                      │
  │  SDA ───────┼───┤ D2  (GPIO4)          │
  │  SCL ───────┼───┤ D1  (GPIO5)          │
  │  VIN ───────┼─┬─┤ 3.3V                 │
  │  GND ───────┼─┼─┤ GND                  │
  └─────────────┘ │ │                      │
                  │ │                      │
  ┌─ DS18B20 ───┐ │ │                      │
  │  DATA ──┬───┼─┼─┤ D4  (GPIO2)          │
  │         │   │ │ │                      │
  │    [4.7kΩ]  │ │ │  ← Pull-up resistor  │
  │         │   │ │ │    (DATA → VCC)       │
  │  VCC ───┴───┼─┘ │                      │
  │  GND ───────┼───┤ GND                  │
  └─────────────┘   │                      │
                    │                      │
  ┌─ GSR ───────┐   │                      │
  │  SIG ───────┼───┤ A0   (ADC)           │
  │  VCC ───────┼───┤ 3.3V                 │
  │  GND ───────┼───┤ GND                  │
  └─────────────┘   │                      │
                    └──────────────────────┘
```

### Pull-Up Resistor Detail (DS18B20)

The 4.7 kΩ resistor is **mandatory** for OneWire communication:

```
     3.3V ──────┐
                │
              [4.7kΩ]
                │
     D4 ────────┤──── DS18B20 DATA pin
```

**Acceptable substitutes:** Two 10 kΩ in parallel (= 5 kΩ), or any value 3.3–10 kΩ.

---

## 3. Voltage & Power

| Component  | Operating Range | Connected To | Notes |
|-----------|----------------|--------------|-------|
| ESP8266    | 3.3V logic     | USB (5V → onboard LDO → 3.3V) | **Never** apply 5V directly to GPIO pins |
| MAX30102   | 1.8V core, 3.3V I2C | 3.3V | Most breakout boards have an onboard 1.8V LDO |
| DS18B20    | 3.0 – 5.5V    | 3.3V | Works fine at 3.3V; pull-up connects to same rail |
| GSR Module | 3.3 – 5V      | 3.3V | SIG output must stay ≤ 3.3V for ESP8266 ADC |

**Power Supply:** Use a **quality USB cable** with data lines and a power source rated ≥ 500 mA.  
Cheap cables or weak laptop USB ports can cause random reboots under WiFi load.

---

## 4. Required Libraries

Install via **Arduino IDE → Sketch → Include Library → Manage Libraries**:

| Library               | Author               | Min Version | Search Term            |
|-----------------------|----------------------|-------------|------------------------|
| SparkFun MAX3010x     | SparkFun Electronics | 1.1.2       | `SparkFun MAX3010x`    |
| OneWire               | Paul Stoffregen      | 2.3.7       | `OneWire`              |
| DallasTemperature     | Miles Burton         | 3.9.0       | `DallasTemperature`    |
| *ESP8266WiFi*         | *(built-in)*         | —           | Comes with board pkg   |
| *ESP8266HTTPClient*   | *(built-in)*         | —           | Comes with board pkg   |

---

## 5. Arduino IDE / Board Setup

1. **Add ESP8266 board URL** — *File → Preferences → Additional Board Manager URLs*:
   ```
   https://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```

2. **Install board package** — *Tools → Board → Board Manager* → search `ESP8266` → install **esp8266 by ESP8266 Community** (v3.x).

3. **Select board** — *Tools → Board → NodeMCU 1.0 (ESP-12E Module)*

4. **Board settings:**

   | Setting        | Value                         |
   |---------------|-------------------------------|
   | CPU Frequency  | 80 MHz                        |
   | Flash Size     | 4MB (FS:2MB OTA:~1019KB)      |
   | Upload Speed   | 115200                        |
   | Port           | (your COM port)               |

---

## 6. Firmware Architecture

The firmware in `arduino/health_monitor/health_monitor.ino` is organised as a
**non-blocking state machine**:

```
  ┌──────────────┐
  │  STATE_INIT  │  → Initialise MAX30102, DS18B20, GSR
  └──────┬───────┘
         ▼
  ┌──────────────────┐
  │ STATE_WIFI_CONNECT│ → Connect to WiFi (finite retries)
  └──────┬───────────┘
         ▼
  ┌──────────────┐
  │ STATE_RUNNING │  → Main loop (runs even if WiFi fails)
  └──────┬───────┘
         │
    ┌────┴──────────────────────────────────────┐
    │  Every ~10ms : Process MAX30102 beats     │
    │  Every  1s   : Read DS18B20, GSR, smooth  │
    │  Every  2s   : Print serial dashboard     │
    │  Every  5s   : POST JSON to backend       │
    └───────────────────────────────────────────┘
```

### Key Design Decisions

| Feature              | Approach                                    | Rationale |
|---------------------|---------------------------------------------|-----------|
| Heart rate detection | SparkFun `checkForBeat()` + 8-pt moving avg | Proper peak detection vs. raw register threshold |
| SpO2                | Red/IR ratio → linear calibration           | Standard Beer-Lambert approximation |
| Temperature         | Non-blocking conversion (`setWaitForConversion(false)`) | DS18B20 takes 750ms at 12-bit; blocking stalls the loop |
| GSR noise           | 10-sample ADC average + EMA smoothing       | Double filtering eliminates analog jitter |
| Watchdog safety     | `yield()` in tight loops + `delay(10)` in main loop | ESP8266 crashes after ~3s without servicing system tasks |
| WiFi resilience     | Non-blocking reconnect with cooldown timer  | Sensor readings continue even when WiFi is down |

---

## 7. Configuration

Edit these three lines in `health_monitor.ino` before uploading:

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL     = "http://YOUR_BACKEND_IP:8000/api/v1/predict";
```

### Tunable Parameters

| Constant                | Default  | What it controls |
|------------------------|----------|-----------------|
| `SENSOR_READ_INTERVAL`  | 1000 ms  | DS18B20/GSR sampling rate |
| `SERVER_POST_INTERVAL`  | 5000 ms  | How often data is POSTed |
| `SERIAL_PRINT_INTERVAL` | 2000 ms  | Dashboard refresh rate |
| `SMOOTH_ALPHA`          | 0.15     | EMA factor (lower = smoother) |
| `GSR_SAMPLES`           | 10       | ADC reads per GSR measurement |
| `IR_FINGER_THRESHOLD`   | 50000    | IR value cutoff for finger detection |

---

## 8. Serial Monitor Output

Open Serial Monitor at **115200 baud**:

```
====================================
  IoT Health Monitor — Booting...
====================================

[154] Initialising MAX30102 pulse oximeter...
[312] ✔ MAX30102 detected
[315] Initialising DS18B20 temperature sensor...
[467] ✔ DS18B20 found (1 device(s))
[468] ✔ GSR sensor ready on A0

Sensor Status:
  MAX30102 (HR/SpO2) : READY
  DS18B20  (Temp)    : READY
  GSR      (Stress)  : READY (analog)

[470] Connecting to WiFi: MyNetwork
..........
[5512] ✔ WiFi connected — IP: 192.168.1.42

╔══════════════════════════════════════════╗
║       IoT HEALTH MONITOR DASHBOARD      ║
╠══════════════════════════════════════════╣
║  ♥ Heart Rate     : 76.3 BPM            ║
║  ☁ SpO2           : 97.4 %              ║
║  🌡 Body Temp      : 36.72 °C            ║
║  ⚡ GSR Resistance : 342.5 kΩ            ║
║  🫁 Resp. Rate     : 16.9 br/min         ║
╠══════════════════════════════════════════╣
║  MAX30102: ✔ OK  |  DS18B20: ✔ OK       ║
║  WiFi: ✔ 192.168.1.42                   ║
╚══════════════════════════════════════════╝
```

---

## 9. Backend Integration

The firmware sends a JSON payload matching the FastAPI backend schema:

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

**Endpoint:** `POST /api/v1/predict`

**Field mapping:**

| Firmware Variable       | JSON Field          | Unit       | Backend Expectation |
|------------------------|---------------------|------------|---------------------|
| `smooth_hr`            | `heart_rate`        | BPM        | 30–250 (float)     |
| `smooth_rr`            | `respiratory_rate`  | breaths/min| 5–40 (float)       |
| `smooth_temp`          | `body_temperature`  | °C         | 35–42 (float)      |
| `smooth_spo2`          | `spo2`              | %          | 70–100 (float)     |
| `smooth_gsr × 1000`    | `gsr`               | Ω          | Optional (float)   |
| `millis()/1000`        | `timestamp`         | seconds    | Normalised by backend |

The backend normalises non-ISO timestamps automatically, so the raw `millis()` value is acceptable.

---

## 10. Troubleshooting

### 10.1 MAX30102 — Not Detected or No Heart Rate

| Symptom | Cause | Fix |
|---------|-------|-----|
| `✘ MAX30102 NOT found on I2C bus!` | Wiring error or bad solder joint | Verify SDA→D2, SCL→D1; run I2C scanner (see below) |
| Heart rate stays at 0 | Finger not pressed firmly | Press flat part of fingertip (not nail) on sensor lens |
| Erratic BPM values | Finger movement during reading | Hold still for 10+ seconds; don't press too hard |
| I2C bus hangs | Long wires or interference | Use wires < 15 cm; MAX30102 breakouts have built-in pull-ups |

**I2C Scanner — verify sensor visibility:**

```cpp
#include <Wire.h>
void setup() {
  Serial.begin(115200);
  Wire.begin(4, 5);  // SDA = D2, SCL = D1
}
void loop() {
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print("Device at 0x");
      Serial.println(addr, HEX);
    }
  }
  Serial.println("--- scan done ---");
  delay(5000);
}
```

MAX30102 should appear at **0x57**.

---

### 10.2 DS18B20 — Returning -127°C

| Symptom | Cause | Fix |
|---------|-------|-----|
| Constant -127.0°C | Sensor not on OneWire bus | ① Check DATA wire to D4 ② **Add 4.7 kΩ pull-up** |
| Constant 85.0°C | Power-on reset value | Conversion not complete; code handles this. If persistent, check power |
| Intermittent -127°C | Loose connection / long cable | Solder joints; keep cable < 1 m on 3.3V |
| `✘ DS18B20 NOT found!` | Missing pull-up or wrong pin | Must have 4.7 kΩ between DATA and 3.3V |

---

### 10.3 GSR — Noisy or Zero Readings

| Symptom | Cause | Fix |
|---------|-------|-----|
| Values jump wildly | ADC noise | Firmware uses 10-sample averaging + EMA (handled) |
| Very high resistance (>1 MΩ) | Fingers not on pads | Ensure both finger electrodes are contacted |
| Zero / near-zero | Short circuit or wrong wiring | Verify SIG→A0, VCC→3.3V, GND→GND |
| 50/60 Hz hum | Mains interference | Shorten wires; twist signal + ground together |

**Tips for clean readings:**
- Clean, dry fingers
- Use index + middle finger, same hand
- Consistent light pressure
- Wait 10–15 s for stabilisation

---

### 10.4 I2C Communication Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| ESP8266 freezes | SDA/SCL stuck LOW | Power-cycle everything |
| Data always 0 | Wrong register config | SparkFun library handles this (already used) |
| Repeated I2C errors | Clock too fast | Try `Wire.setClock(100000)` (100 kHz) |
| Boot failure on D4 | GPIO2 pulled LOW at boot | The 4.7 kΩ pull-up naturally keeps it HIGH |

---

### 10.5 ESP8266 — Watchdog Resets

| Symptom | Cause | Fix |
|---------|-------|-----|
| `wdt reset` in serial | Code blocked > 3 s without `yield()` | All loops include `yield()` (handled) |
| `Soft WDT reset` | Long WiFi operation or I2C tx | `delay(10)` after each loop iteration |
| Stack overflow | Large local arrays | Use `static` or global variables |
| Random reboots | Weak USB power | Use quality cable + 5V/1A+ power supply |

---

## 11. Quick-Start Checklist

- [ ] Wire MAX30102: SDA→D2, SCL→D1, VIN→3.3V, GND→GND
- [ ] Wire DS18B20: DATA→D4, VCC→3.3V, GND→GND
- [ ] Add **4.7 kΩ resistor** between DS18B20 DATA and 3.3V
- [ ] Wire GSR: SIG→A0, VCC→3.3V, GND→GND
- [ ] Install ESP8266 board package in Arduino IDE / PlatformIO
- [ ] Install libraries: **SparkFun MAX3010x**, **OneWire**, **DallasTemperature**
- [ ] Open `arduino/health_monitor/health_monitor.ino`
- [ ] Edit WiFi SSID, password, and server URL
- [ ] Select board: **NodeMCU 1.0 (ESP-12E Module)**
- [ ] Upload firmware
- [ ] Open Serial Monitor at **115200 baud**
- [ ] Place fingertip firmly on MAX30102 — verify HR/SpO2 readings
- [ ] Check DS18B20 temperature (should show ~25–36°C depending on contact)
- [ ] Touch GSR pads — verify resistance drops
- [ ] Start backend (`uvicorn backend.main:app --port 8000`)
- [ ] Confirm data appears on dashboard at `http://localhost:3000`
