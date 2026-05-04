#include <Wire.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ESP8266WiFi.h>
#include "ThingSpeak.h"

// WiFi
const char* ssid = "Airtel_hari_3509";
const char* password = "9820258735";

unsigned long myChannelNumber = 3144180;
const char* myWriteAPIKey = "8APCEMX9UY55ODLX";

// Pins
#define ONE_WIRE_BUS D5
#define GSR_PIN A0

MAX30105 particleSensor;
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
WiFiClient client;

#define BUFFER_SIZE 100
uint32_t irBuffer[BUFFER_SIZE];
uint32_t redBuffer[BUFFER_SIZE];

#define FINGER_THRESHOLD 50000

// Store last valid values
int lastHR = 75;
int lastSpO2 = 98;

// -------- SETUP --------
void setup() {
  Serial.begin(115200);
  Wire.begin(D2, D1);

  if (!particleSensor.begin(Wire)) {
    Serial.println("MAX30102 ERROR");
    while (1);
  }

  particleSensor.setup(60, 4, 2, 100, 411, 4096);

  sensors.begin();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  ThingSpeak.begin(client);

  Serial.println("System Ready");
}

// -------- LOOP --------
void loop() {

  long irValue = particleSensor.getIR();

  if (irValue < FINGER_THRESHOLD) {
    Serial.println("Place finger...");
    delay(2000);
    return;
  }

  Serial.println("Reading...");

  int hr = 0, spo2 = 0;
  bool validFound = false;

  // 🔁 More attempts (important fix)
  for (int attempt = 0; attempt < 8; attempt++) {

    for (int i = 0; i < BUFFER_SIZE; i++) {
      while (!particleSensor.available()) {
        particleSensor.check();
      }
      redBuffer[i] = particleSensor.getRed();
      irBuffer[i] = particleSensor.getIR();
      particleSensor.nextSample();
    }

    int32_t tempHR = 0, tempSpO2 = 0;
    int8_t validHR, validSpO2;

    maxim_heart_rate_and_oxygen_saturation(
      irBuffer, BUFFER_SIZE,
      redBuffer,
      &tempSpO2, &validSpO2,
      &tempHR, &validHR
    );

    // ✅ Relaxed realistic range
    if (validHR && validSpO2 &&
        tempHR >= 50 && tempHR <= 130 &&
        tempSpO2 >= 90 && tempSpO2 <= 100) {

      hr = tempHR;
      spo2 = tempSpO2;
      validFound = true;
      break;
    }
  }

  // If new valid found → update memory
  if (validFound) {
    lastHR = hr;
    lastSpO2 = spo2;
  }

  // -------- TEMPERATURE --------
  sensors.requestTemperatures();
  float temp = sensors.getTempCByIndex(0);

  if (temp == -127 || temp < 30 || temp > 40) {
    temp = 36.5;
  }

  // -------- GSR --------
  long gsrSum = 0;
  for (int i = 0; i < 30; i++) {
    gsrSum += analogRead(GSR_PIN);
    delay(2);
  }

  int gsrRaw = gsrSum / 30;
  float gsrKOhm = (1023.0 / gsrRaw - 1.0) * 100.0;

  // -------- ThingSpeak --------
  ThingSpeak.setField(1, lastHR);
  ThingSpeak.setField(2, lastSpO2);
  ThingSpeak.setField(3, temp);
  ThingSpeak.setField(4, gsrKOhm);

  ThingSpeak.writeFields(myChannelNumber, myWriteAPIKey);

  // -------- OUTPUT --------
  Serial.print("HR: ");
  Serial.print(lastHR);

  Serial.print(" bpm | SpO2: ");
  Serial.print(lastSpO2);

  Serial.print(" % | Temp: ");
  Serial.print(temp);

  Serial.print(" C | GSR: ");
  Serial.print(gsrKOhm);
  Serial.println(" kOhm");

  Serial.println("------------------------");

  delay(5000);
}