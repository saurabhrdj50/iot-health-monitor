# Hardware Guide

## Wiring

| Sensor | Pin | ESP8266 Pin | Notes |
|---|---|---|---|
| MAX30102 | SDA | D2 | I2C data |
| MAX30102 | SCL | D1 | I2C clock |
| MAX30102 | VIN | 3.3V | Use a 3.3V-safe breakout |
| MAX30102 | GND | GND | Shared ground |
| DS18B20 | DATA | D4 | OneWire bus |
| DS18B20 | VCC | 3.3V | Shared rail |
| DS18B20 | GND | GND | Shared ground |
| DS18B20 | 4.7k resistor | DATA to 3.3V | Required pull-up |
| GSR | SIG | A0 | Analog input |
| GSR | VCC | 3.3V | Shared rail |
| GSR | GND | GND | Shared ground |

## Required Libraries

- `SparkFun MAX3010x`
- `OneWire`
- `DallasTemperature`
- `ThingSpeak`

## Board Setup

1. Add `https://arduino.esp8266.com/stable/package_esp8266com_index.json`
2. Install `esp8266 by ESP8266 Community`
3. Select `NodeMCU 1.0 (ESP-12E Module)`
4. Upload speed: `115200`

## Firmware Files

- Sketch: [thingspeak_ml_enhanced.ino](/C:/Users/gupta/Desktop/iot-health-monitor/arduino/health_monitor/thingspeak_ml_enhanced/thingspeak_ml_enhanced.ino)
- Secrets: [secrets.h](/C:/Users/gupta/Desktop/iot-health-monitor/arduino/health_monitor/thingspeak_ml_enhanced/secrets.h)

## Configuration

Set the values in `secrets.h` before uploading:

```cpp
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASS "YOUR_WIFI_PASSWORD"
#define THINGSPEAK_CHANNEL_ID 3144180UL
#define THINGSPEAK_WRITE_API_KEY "YOUR_THINGSPEAK_WRITE_API_KEY"
```

## Expected Serial Output

```text
Connecting to WiFi...
Connected. IP: 192.168.x.x
System Ready
HR: 78
SpO2: 97
Temp: 36.6
GSR: 412
Stress: 22
------------------
```

## Troubleshooting

- If MAX30102 is missing, verify `D2` and `D1` and run an I2C scanner.
- If DS18B20 shows `-127`, check the 4.7k pull-up resistor and `D5`.
- If GSR is noisy, shorten wires and keep a common ground.
- If uploads fail, try a different USB data cable.
- If the dashboard stays empty, confirm ThingSpeak is receiving new entries and the backend is running.
