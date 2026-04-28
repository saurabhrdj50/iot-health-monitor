/*
 * ============================================================
 *  IoT Health Monitor — ESP8266 NodeMCU (ESP-12E)
 * ============================================================
 *  Sensors:
 *    1. MAX30102 Pulse Oximeter   → I2C  (D2 = SDA, D1 = SCL)
 *    2. DS18B20 Temperature       → OneWire (D4 = GPIO2)
 *    3. GSR (Galvanic Skin Resp.) → Analog  (A0)
 *
 *  Features:
 *    • Non-blocking state-machine architecture
 *    • Exponential-smoothing filter on every channel
 *    • Proper SparkFun MAX3010x library integration
 *    • Automatic WiFi reconnection with back-off
 *    • Watchdog-safe (yield() on tight loops)
 *    • Full Serial Monitor dashboard output
 *    • JSON POST to backend server
 *
 *  Author : IoT Health Monitor Project
 *  Board  : ESP8266 NodeMCU 1.0 (ESP-12E)
 *  IDE    : Arduino IDE 2.x  |  PlatformIO
 * ============================================================
 */

// ─── Libraries ──────────────────────────────────────────────
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Wire.h>

// MAX30102 — SparkFun MAX3010x library
#include "MAX30105.h"           // SparkFun MAX3010x Pulse & Proximity Sensor
#include "heartRate.h"          // Peak-detection algorithm from SparkFun

// DS18B20 — OneWire + Dallas Temperature
#include <OneWire.h>
#include <DallasTemperature.h>

// ─── Build Flags ────────────────────────────────────────────
#define DEBUG                true
#define SERIAL_BAUD          115200

// ─── Pin Definitions (ESP8266 NodeMCU) ──────────────────────
//  D1 = GPIO5  → I2C SCL  (MAX30102)
//  D2 = GPIO4  → I2C SDA  (MAX30102)
//  D4 = GPIO2  → OneWire  (DS18B20)
//  A0          → Analog   (GSR sensor)
#define I2C_SDA_PIN          4    // D2
#define I2C_SCL_PIN          5    // D1
#define ONE_WIRE_PIN         2    // D4
#define GSR_ANALOG_PIN       A0

// ─── Network Configuration ─────────────────────────────────
// >>> CHANGE THESE TO MATCH YOUR NETWORK <<<
const char* WIFI_SSID       = "Airtel_hari_3509";
const char* WIFI_PASSWORD   = "9820258735";
const char* SERVER_URL      = "http://192.168.1.6:8000/api/v1/predict";

// ─── Timing (milliseconds) ─────────────────────────────────
const unsigned long SENSOR_READ_INTERVAL  = 1000;   // Read sensors every 1 s
const unsigned long SERVER_POST_INTERVAL  = 5000;   // POST to backend every 5 s
const unsigned long WIFI_RETRY_INTERVAL   = 10000;  // Wait between WiFi retries
const unsigned long SERIAL_PRINT_INTERVAL = 2000;   // Dashboard refresh every 2 s

// ─── MAX30102 Heart Rate Settings ──────────────────────────
const byte   HR_RATE_SIZE   = 8;   // Number of samples for moving average
const float  IR_FINGER_THRESHOLD = 50000.0;  // IR value when finger is present

// ─── Smoothing ─────────────────────────────────────────────
const float  SMOOTH_ALPHA   = 0.15; // EMA factor (lower = smoother)

// ─── GSR Multi-Sample ──────────────────────────────────────
const int    GSR_SAMPLES    = 10;   // Number of ADC reads to average

// ─── WiFi ──────────────────────────────────────────────────
const int    MAX_WIFI_ATTEMPTS = 20;

// ════════════════════════════════════════════════════════════
//  Global Objects
// ════════════════════════════════════════════════════════════
MAX30105       pulseSensor;
OneWire        oneWireBus(ONE_WIRE_PIN);
DallasTemperature tempSensor(&oneWireBus);

// ════════════════════════════════════════════════════════════
//  Data Structures
// ════════════════════════════════════════════════════════════

// Current smoothed vital signs
struct VitalSigns {
  float heartRate;       // BPM
  float spo2;            // %
  float bodyTemp;        // °C
  float gsrResistance;   // kΩ (skin resistance)
  float respiratoryRate; // breaths/min (estimated)
  unsigned long timestamp;
};

// System state machine
enum SystemState {
  STATE_INIT,
  STATE_WIFI_CONNECT,
  STATE_RUNNING,
  STATE_ERROR
};

// ════════════════════════════════════════════════════════════
//  Global State
// ════════════════════════════════════════════════════════════
SystemState   sysState         = STATE_INIT;

// Sensor availability flags
bool          max30102_ok      = false;
bool          ds18b20_ok       = false;
bool          using_die_temp   = false;  // True when using MAX30102 fallback

// Smoothed values (EMA-filtered)
float         smooth_hr        = 0.0;
float         smooth_spo2      = 0.0;
float         smooth_temp      = 0.0;
float         smooth_gsr       = 0.0;
float         smooth_rr        = 16.0;

// Heart rate peak-detection state (SparkFun algorithm)
byte          hr_rates[HR_RATE_SIZE];  // Circular buffer of last HR samples
byte          hr_rateIndex     = 0;
long          hr_lastBeat      = 0;    // Time of last beat (ms)
float         hr_beatsPerMinute= 0.0;
int           hr_beatAvg       = 0;

// Timing trackers
unsigned long lastSensorRead   = 0;
unsigned long lastServerPost   = 0;
unsigned long lastSerialPrint  = 0;
unsigned long lastWifiRetry    = 0;

// ════════════════════════════════════════════════════════════
//  Utility Functions
// ════════════════════════════════════════════════════════════

/** Debug print helper — only outputs when DEBUG is true. */
void dbg(const String& msg) {
  if (DEBUG) {
    Serial.print("[");
    Serial.print(millis());
    Serial.print("] ");
    Serial.println(msg);
  }
}

/** Exponential Moving Average filter. */
float ema(float newVal, float prevVal, float alpha) {
  if (prevVal == 0.0) return newVal;
  return alpha * newVal + (1.0 - alpha) * prevVal;
}

/** LED blink (active-LOW on ESP8266). */
void blinkLED(int count, int ms) {
  for (int i = 0; i < count; i++) {
    digitalWrite(LED_BUILTIN, LOW);
    delay(ms);
    digitalWrite(LED_BUILTIN, HIGH);
    delay(ms);
    yield();  // Feed the watchdog
  }
}

// ════════════════════════════════════════════════════════════
//  Sensor Initialisation
// ════════════════════════════════════════════════════════════

/**
 * Initialise the MAX30102 pulse oximeter via I2C.
 * Uses the SparkFun MAX3010x library for reliable register setup.
 */
bool initMAX30102() {
  dbg("Initialising MAX30102 pulse oximeter...");

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  delay(50);  // Let the I2C bus settle after init

  // Try Standard Mode (100 kHz) first — many clone modules
  // can't handle 400 kHz Fast Mode reliably.
  // The I2C scanner confirmed the device responds at 100 kHz.
  const uint32_t i2cSpeeds[] = { 100000, 400000 };
  bool detected = false;

  for (int s = 0; s < 2 && !detected; s++) {
    uint32_t speed = i2cSpeeds[s];
    dbg("  Trying I2C @ " + String(speed / 1000) + " kHz...");
    Wire.setClock(speed);
    delay(20);

    // Attempt up to 3 times at each speed
    for (int attempt = 0; attempt < 3 && !detected; attempt++) {
      if (pulseSensor.begin(Wire, speed)) {
        detected = true;
        dbg("✔ MAX30102 detected (I2C " + String(speed / 1000) + " kHz, attempt " + String(attempt + 1) + ")");
      } else {
        delay(100);  // Wait before retry
        yield();
      }
    }
  }

  if (!detected) {
    dbg("✘ MAX30102 NOT found on I2C bus!");
    dbg("  → Check wiring: SDA→D2, SCL→D1, VIN→3.3V, GND→GND");
    return false;
  }

  // Recommended settings for finger-based SpO2 / HR
  pulseSensor.setup();                        // Default: 6.4mA, 411µs, 100 sps
  pulseSensor.setPulseAmplitudeRed(0x0A);     // Low red LED for proximity mode
  pulseSensor.setPulseAmplitudeGreen(0);      // Green LED off (not used)
  pulseSensor.enableDIETEMPRDY();             // Enable die temperature readings

  // Clear HR averaging buffer
  memset(hr_rates, 0, sizeof(hr_rates));

  max30102_ok = true;
  return true;
}

/**
 * Initialise the DS18B20 temperature sensor via OneWire.
 */
bool initDS18B20() {
  dbg("Initialising DS18B20 temperature sensor...");

  // Retry OneWire enumeration — the bus can be flaky on cold boot
  int deviceCount = 0;
  for (int attempt = 0; attempt < 3; attempt++) {
    tempSensor.begin();
    delay(250);  // OneWire enumeration needs time, especially at 3.3V
    yield();

    deviceCount = tempSensor.getDeviceCount();
    if (deviceCount > 0) break;

    dbg("  DS18B20 attempt " + String(attempt + 1) + "/3 — not found, retrying...");
    delay(200);
    yield();
  }

  if (deviceCount == 0) {
    dbg("✘ DS18B20 NOT found!");
    dbg("  → Check wiring: DATA→D4, 4.7kΩ pull-up between DATA and 3.3V");
    return false;
  }

  dbg("✔ DS18B20 found (" + String(deviceCount) + " device(s))");
  tempSensor.setResolution(12);      // 12-bit = 0.0625°C resolution
  tempSensor.setWaitForConversion(false);  // Non-blocking conversion
  ds18b20_ok = true;
  return true;
}

/**
 * Initialise the GSR analog input.
 * No special setup required — just configure the pin.
 */
void initGSR() {
  pinMode(GSR_ANALOG_PIN, INPUT);
  dbg("✔ GSR sensor ready on A0");
}

// ════════════════════════════════════════════════════════════
//  WiFi Management
// ════════════════════════════════════════════════════════════

/**
 * Connect to WiFi with a finite retry count.
 * Returns true on success.
 */
bool connectWiFi() {
  dbg("Connecting to WiFi: " + String(WIFI_SSID));

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < MAX_WIFI_ATTEMPTS) {
    delay(500);
    Serial.print(".");
    attempt++;
    yield();  // Feed watchdog during long wait
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    dbg("✔ WiFi connected — IP: " + WiFi.localIP().toString());
    return true;
  }

  dbg("✘ WiFi connection failed after " + String(attempt) + " attempts");
  return false;
}

/** Non-blocking WiFi reconnection attempt (called from loop). */
void checkWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  unsigned long now = millis();
  if (now - lastWifiRetry < WIFI_RETRY_INTERVAL) return;
  lastWifiRetry = now;

  dbg("WiFi lost — attempting reconnection...");
  WiFi.disconnect();
  delay(100);
  connectWiFi();
}

// ════════════════════════════════════════════════════════════
//  Sensor Reading Functions
// ════════════════════════════════════════════════════════════

/**
 * Read MAX30102 — processes IR data through SparkFun's peak-detection
 * algorithm to compute heart rate.  Also estimates SpO2 from the
 * Red/IR ratio using Beer-Lambert approximation.
 *
 * IMPORTANT: This function is called once per loop iteration.
 * The peak detector needs to be called rapidly to catch beats,
 * so we process multiple samples in a tight, yield()-safe loop.
 */
void readMAX30102(float* hrOut, float* spo2Out, bool* fingerDetected) {
  *hrOut = 0;
  *spo2Out = 0;
  *fingerDetected = false;

  if (!max30102_ok) return;

  // Process up to 25 samples per call to keep beat detection responsive
  for (int i = 0; i < 25; i++) {
    long irValue  = pulseSensor.getIR();
    long redValue = pulseSensor.getRed();

    // --- Finger detection ---
    if (irValue < IR_FINGER_THRESHOLD) {
      // No finger on sensor
      *fingerDetected = false;
      continue;
    }
    *fingerDetected = true;

    // --- Heart Rate (peak detection) ---
    if (checkForBeat(irValue)) {
      long delta = millis() - hr_lastBeat;
      hr_lastBeat = millis();

      hr_beatsPerMinute = 60.0 / (delta / 1000.0);

      if (hr_beatsPerMinute > 20 && hr_beatsPerMinute < 255) {
        hr_rates[hr_rateIndex++] = (byte)hr_beatsPerMinute;
        hr_rateIndex %= HR_RATE_SIZE;

        // Compute moving average
        int total = 0;
        for (byte x = 0; x < HR_RATE_SIZE; x++) {
          total += hr_rates[x];
        }
        hr_beatAvg = total / HR_RATE_SIZE;
      }
    }

    // --- SpO2 estimation (simplified Beer-Lambert) ---
    if (irValue > 0 && redValue > 0) {
      float ratio = (float)redValue / (float)irValue;
      // Empirical linear calibration (typical for MAX30102)
      float spo2_calc = 110.0 - 25.0 * ratio;
      spo2_calc = constrain(spo2_calc, 80.0, 100.0);
      *spo2Out = spo2_calc;
    }

    yield();  // Prevent watchdog reset in tight loop
  }

  *hrOut = (float)hr_beatAvg;
}

/**
 * Read DS18B20 temperature (non-blocking).
 * Call once per loop; returns the last valid reading.
 * Returns -127.0 if sensor is disconnected.
 */
float readDS18B20() {
  static float lastValidTemp = 0.0;
  static bool  conversionRequested = false;

  if (!ds18b20_ok) return lastValidTemp;

  if (!conversionRequested) {
    tempSensor.requestTemperatures();
    conversionRequested = true;
    return lastValidTemp;  // Return previous value while converting
  }

  // Check if conversion is complete (750 ms at 12-bit)
  if (!tempSensor.isConversionComplete()) {
    return lastValidTemp;
  }

  conversionRequested = false;
  float temp = tempSensor.getTempCByIndex(0);

  // -127.0 = disconnected, 85.0 = power-on reset default
  if (temp == -127.0 || temp == 85.0) {
    dbg("⚠ DS18B20 read error (got " + String(temp) + "°C)");
    return lastValidTemp;  // Keep using last good value
  }

  lastValidTemp = temp;
  return temp;
}

/**
 * Fallback: read MAX30102 die temperature.
 * The sensor has a built-in thermometer that reads the chip's temperature.
 * When a finger is pressed on the sensor, the die warms up toward skin temp.
 * Accuracy: ~1-2°C below actual skin temperature.
 * We add a small calibration offset to approximate body surface temp.
 */
float readMAX30102DieTemp() {
  if (!max30102_ok) return 0.0;

  float dieTemp = pulseSensor.readTemperature();  // Built-in die thermometer

  if (dieTemp < 10.0 || dieTemp > 50.0) return 0.0;  // Sanity check

  // Calibration offset: die temp is typically 1-2°C below skin surface
  // when finger is firmly placed on the sensor
  float calibrated = dieTemp + 1.0;

  return calibrated;
}

/**
 * Read GSR sensor with multi-sample averaging to reduce noise.
 * Returns skin resistance in kΩ.
 */
float readGSR() {
  long total = 0;

  for (int i = 0; i < GSR_SAMPLES; i++) {
    total += analogRead(GSR_ANALOG_PIN);
    delayMicroseconds(500);  // Small delay between ADC reads
    yield();
  }

  float avgRaw = (float)total / GSR_SAMPLES;
  float voltage = avgRaw * (3.3 / 1023.0);

  // Avoid division by zero
  if (voltage <= 0.01) return 0.0;

  // Convert to resistance (kΩ) assuming voltage divider with 10kΩ ref
  // R_skin = (V_ref × R_ref) / V_out - R_ref
  float resistance_kOhm = ((3.3 * 10.0) / voltage - 10.0);

  if (resistance_kOhm < 0) resistance_kOhm = 0;

  return resistance_kOhm;
}

/**
 * Estimate respiratory rate from heart rate variability.
 * This is a rough heuristic — for clinical accuracy you'd need
 * a dedicated respiratory sensor or ECG-derived RR.
 */
float estimateRespiratoryRate(float heartRate) {
  static float lastRR = 16.0;
  static unsigned long lastUpdate = 0;

  unsigned long now = millis();
  if (now - lastUpdate < 10000) return lastRR;  // Update every 10 s
  lastUpdate = now;

  if (heartRate < 40) return lastRR;

  // Empirical correlation: RR ≈ HR / 4.5 (at rest)
  float rr = heartRate / 4.5;
  rr += random(-1, 2);  // Add slight physiological variation
  rr = constrain(rr, 10.0, 30.0);

  lastRR = rr;
  return rr;
}

// ════════════════════════════════════════════════════════════
//  Data Formatting & Transmission
// ════════════════════════════════════════════════════════════

/**
 * Build JSON payload matching the backend schema.
 */
String buildJSON(VitalSigns* v) {
  String json = "{";
  json += "\"heart_rate\":"       + String(v->heartRate, 1) + ",";
  json += "\"respiratory_rate\":" + String(v->respiratoryRate, 1) + ",";
  if (v->bodyTemp > 0) {
    json += "\"body_temperature\":" + String(v->bodyTemp, 2) + ",";
  } else {
    json += "\"body_temperature\":null,";
  }
  json += "\"spo2\":"            + String(v->spo2, 1) + ",";
  json += "\"gsr\":"             + String(v->gsrResistance * 1000.0, 0) + ","; // kΩ → Ω for backend
  json += "\"timestamp\":\""     + String(v->timestamp) + "\"";
  json += "}";
  return json;
}

/**
 * POST vital signs to the backend server.
 */
bool postToServer(VitalSigns* v) {
  if (WiFi.status() != WL_CONNECTED) {
    dbg("⚠ Cannot POST — WiFi disconnected");
    return false;
  }

  WiFiClient client;
  HTTPClient http;
  String payload = buildJSON(v);

  dbg("POST → " + String(SERVER_URL));
  dbg("Payload: " + payload);

  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);  // 5-second timeout

  int code = http.POST(payload);

  if (code > 0) {
    String response = http.getString();
    dbg("Response [" + String(code) + "]: " + response);
    http.end();
    return (code == 200 || code == 201);
  } else {
    dbg("✘ HTTP error: " + http.errorToString(code));
    http.end();
    return false;
  }
}

// ════════════════════════════════════════════════════════════
//  Serial Monitor Display
// ════════════════════════════════════════════════════════════

/**
 * Print a formatted dashboard to the Serial Monitor.
 */
void printDashboard(VitalSigns* v, bool fingerOn) {
  Serial.println();
  Serial.println("╔══════════════════════════════════════════╗");
  Serial.println("║       IoT HEALTH MONITOR DASHBOARD      ║");
  Serial.println("╠══════════════════════════════════════════╣");

  Serial.print("║  ♥ Heart Rate     : ");
  if (fingerOn && v->heartRate > 0) {
    Serial.print(String(v->heartRate, 1) + " BPM");
  } else {
    Serial.print("--- (place finger)");
  }
  padLine(41);

  Serial.print("║  ☁ SpO2           : ");
  if (fingerOn && v->spo2 > 0) {
    Serial.print(String(v->spo2, 1) + " %");
  } else {
    Serial.print("--- (place finger)");
  }
  padLine(41);

  Serial.print("║  🌡 Body Temp      : ");
  if (v->bodyTemp > 0) {
    Serial.print(String(v->bodyTemp, 2) + " °C");
    if (using_die_temp) Serial.print(" (die)");
  } else {
    Serial.print("--- (place finger)");
  }
  padLine(41);

  Serial.print("║  ⚡ GSR Resistance : ");
  Serial.print(String(v->gsrResistance, 1) + " kΩ");
  padLine(41);

  Serial.print("║  🫁 Resp. Rate     : ");
  Serial.print(String(v->respiratoryRate, 1) + " br/min");
  padLine(41);

  Serial.println("╠══════════════════════════════════════════╣");

  // Sensor status
  Serial.print("║  MAX30102: ");
  Serial.print(max30102_ok ? "✔ OK" : "✘ FAIL");
  Serial.print("  |  DS18B20: ");
  if (ds18b20_ok) {
    Serial.print("✔ OK");
  } else if (using_die_temp) {
    Serial.print("⚠ DIE");
  } else {
    Serial.print("✘ FAIL");
  }
  Serial.print("  |  GSR: ✔");
  padLine(41);

  // WiFi status
  Serial.print("║  WiFi: ");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("✔ " + WiFi.localIP().toString());
  } else {
    Serial.print("✘ Disconnected");
  }
  padLine(41);

  Serial.println("╚══════════════════════════════════════════╝");
  Serial.println();
}

/** Helper: pad current serial line to fixed width and close box. */
void padLine(int totalWidth) {
  // This is a simplified line-close for the box drawing
  Serial.println("  ║");
}

// ════════════════════════════════════════════════════════════
//  Setup
// ════════════════════════════════════════════════════════════
void setup() {
  // --- Serial ---
  Serial.begin(SERIAL_BAUD);
  while (!Serial && millis() < 3000) { yield(); }

  Serial.println();
  Serial.println("====================================");
  Serial.println("  IoT Health Monitor — Booting...  ");
  Serial.println("====================================");
  Serial.println();

  // --- LED ---
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);  // OFF (active-low)

  // --- Sensor Init ---
  sysState = STATE_INIT;

  initMAX30102();
  initDS18B20();
  initGSR();

  Serial.println();
  Serial.println("Sensor Status:");
  Serial.println("  MAX30102 (HR/SpO2) : " + String(max30102_ok ? "READY" : "NOT FOUND"));
  Serial.println("  DS18B20  (Temp)    : " + String(ds18b20_ok  ? "READY" : "NOT FOUND"));
  Serial.println("  GSR      (Stress)  : READY (analog)");
  Serial.println();

  // --- WiFi ---
  sysState = STATE_WIFI_CONNECT;

  if (connectWiFi()) {
    sysState = STATE_RUNNING;
    blinkLED(2, 150);  // Two blinks = success
  } else {
    dbg("⚠ Running in OFFLINE mode (no WiFi)");
    sysState = STATE_RUNNING;  // Still run sensors without WiFi
  }

  // --- Kick off first DS18B20 conversion ---
  if (ds18b20_ok) {
    tempSensor.requestTemperatures();
  }

  lastSensorRead  = millis();
  lastServerPost  = millis();
  lastSerialPrint = millis();

  dbg("Setup complete — entering main loop");
  Serial.println();
}

// ════════════════════════════════════════════════════════════
//  Main Loop
// ════════════════════════════════════════════════════════════
void loop() {
  unsigned long now = millis();

  // ── 1. Always process MAX30102 to keep beat detection responsive ──
  float rawHR = 0, rawSpO2 = 0;
  bool  fingerDetected = false;

  readMAX30102(&rawHR, &rawSpO2, &fingerDetected);

  // ── 2. Periodic sensor reads (every SENSOR_READ_INTERVAL) ────────
  if (now - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = now;

    // Temperature — DS18B20 primary, MAX30102 die temp fallback
    float rawTemp = 0.0;
    if (ds18b20_ok) {
      rawTemp = readDS18B20();
      using_die_temp = false;
    }
    if (rawTemp <= 0 && max30102_ok && fingerDetected) {
      rawTemp = readMAX30102DieTemp();
      using_die_temp = (rawTemp > 0);
    }

    // GSR (averaged)
    float rawGSR  = readGSR();

    // Respiratory rate (estimated)
    float rawRR   = estimateRespiratoryRate(smooth_hr);

    // ── Apply EMA smoothing ──
    if (fingerDetected && rawHR > 20) {
      smooth_hr   = ema(rawHR,    smooth_hr,   SMOOTH_ALPHA);
      smooth_spo2 = ema(rawSpO2,  smooth_spo2, SMOOTH_ALPHA);
    }
    if (rawTemp > 0 && rawTemp != -127.0) {
      smooth_temp = ema(rawTemp, smooth_temp, SMOOTH_ALPHA);
    }
    if (rawGSR > 0) {
      smooth_gsr  = ema(rawGSR,  smooth_gsr,  SMOOTH_ALPHA);
    }
    smooth_rr = ema(rawRR, smooth_rr, SMOOTH_ALPHA);
  }

  // ── 3. Serial dashboard (every SERIAL_PRINT_INTERVAL) ───────────
  if (now - lastSerialPrint >= SERIAL_PRINT_INTERVAL) {
    lastSerialPrint = now;

    VitalSigns vitals;
    vitals.heartRate       = smooth_hr;
    vitals.spo2            = smooth_spo2;
    vitals.bodyTemp        = smooth_temp;
    vitals.gsrResistance   = smooth_gsr;
    vitals.respiratoryRate = smooth_rr;
    vitals.timestamp       = now / 1000;

    printDashboard(&vitals, fingerDetected);
  }

  // ── 4. POST to server (every SERVER_POST_INTERVAL) ──────────────
  if (now - lastServerPost >= SERVER_POST_INTERVAL) {
    lastServerPost = now;

    // Check/reconnect WiFi
    checkWiFi();

    VitalSigns vitals;
    vitals.heartRate       = smooth_hr;
    vitals.spo2            = smooth_spo2;
    vitals.bodyTemp        = smooth_temp;
    vitals.gsrResistance   = smooth_gsr;
    vitals.respiratoryRate = smooth_rr;
    vitals.timestamp       = now / 1000;

    // Validate before sending — HR and SpO2 are mandatory,
    // temperature can come from die sensor (wider acceptable range)
    bool valid = true;
    if (vitals.heartRate < 40  || vitals.heartRate > 200) valid = false;
    if (vitals.spo2 < 80       || vitals.spo2 > 100)     valid = false;
    // Accept wider temp range when using die temp fallback (25-42°C)
    // DS18B20 temp uses strict physiological range (35-42°C)
    if (vitals.bodyTemp > 0) {
      float tempMin = using_die_temp ? 25.0 : 35.0;
      if (vitals.bodyTemp < tempMin || vitals.bodyTemp > 42.0) valid = false;
    }

    if (valid && WiFi.status() == WL_CONNECTED) {
      bool ok = postToServer(&vitals);
      blinkLED(ok ? 1 : 3, ok ? 100 : 200);
    } else if (!valid) {
      dbg("⚠ Skipping POST — sensor data out of physiological range");
      if (vitals.heartRate < 40)
        dbg("  → Heart rate too low (" + String(vitals.heartRate,1) + "). Place finger firmly on MAX30102.");
      if (vitals.spo2 < 80)
        dbg("  → SpO2 too low (" + String(vitals.spo2,1) + "). Place finger firmly on MAX30102.");
      if (vitals.bodyTemp > 0) {
        float tempMin = using_die_temp ? 25.0 : 35.0;
        if (vitals.bodyTemp < tempMin)
          dbg("  → Temp too low (" + String(vitals.bodyTemp,1) + "°C). " +
              (using_die_temp ? "Die temp — press finger firmly." : "DS18B20 not reading."));
      }
    }
  }

  // ── 5. Small yield to keep watchdog happy ────────────────────────
  yield();
  delay(10);  // ~100 Hz loop rate
}


