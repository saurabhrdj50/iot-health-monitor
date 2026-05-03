#include <DallasTemperature.h>
#include <ESP8266WiFi.h>
#include <OneWire.h>
#include <ThingSpeak.h>
#include <Wire.h>

#include "MAX30105.h"
#include "spo2_algorithm.h"
#include "secrets.h"

#define ONE_WIRE_BUS D5
#define GSR_PIN A0
#define SAMPLE_COUNT 100

MAX30105 particleSensor;
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature temperatureSensor(&oneWire);
WiFiClient wifiClient;

uint32_t irBuffer[SAMPLE_COUNT];
uint32_t redBuffer[SAMPLE_COUNT];

float avgHeartRate = 75.0f;
float avgSpo2 = 98.0f;
float hrvEstimate = 50.0f;
float stressLevel = 0.0f;

float calculateStress(float heartRate, float hrv, int gsr, float bodyTemp) {
  heartRate = constrain(heartRate, 60, 120);
  hrv = constrain(hrv, 20, 100);
  gsr = constrain(gsr, 300, 900);

  float stress = 0.0f;
  stress += map((long) heartRate, 60, 120, 0, 40);
  stress += map((long) hrv, 100, 20, 0, 30);
  stress += map((long) gsr, 300, 900, 0, 20);

  float tempDiff = abs(bodyTemp - 36.5f);
  stress += map((long) (tempDiff * 10), 0, 30, 0, 10);

  return constrain(stress, 0.0f, 100.0f);
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected. IP: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  Wire.begin(D2, D1);

  if (!particleSensor.begin(Wire)) {
    Serial.println("MAX30102 ERROR");
    while (true) {
      delay(1000);
    }
  }

  particleSensor.setup();
  temperatureSensor.begin();
  connectWifi();
  ThingSpeak.begin(wifiClient);

  Serial.println("System Ready");
}

void loop() {
  temperatureSensor.requestTemperatures();
  float bodyTemp = temperatureSensor.getTempCByIndex(0);
  if (bodyTemp == -127.0f) {
    Serial.println("DS18B20 unavailable, using fallback temperature");
    bodyTemp = 36.5f;
  }

  int gsr = analogRead(GSR_PIN);

  for (int index = 0; index < SAMPLE_COUNT; index++) {
    while (!particleSensor.available()) {
      particleSensor.check();
    }
    redBuffer[index] = particleSensor.getRed();
    irBuffer[index] = particleSensor.getIR();
    particleSensor.nextSample();
  }

  int32_t heartRate = 0;
  int32_t spo2 = 0;
  int8_t validHeartRate = 0;
  int8_t validSpo2 = 0;

  maxim_heart_rate_and_oxygen_saturation(
    irBuffer,
    SAMPLE_COUNT,
    redBuffer,
    &spo2,
    &validSpo2,
    &heartRate,
    &validHeartRate
  );

  if (validHeartRate && validSpo2) {
    avgHeartRate = 0.85f * avgHeartRate + 0.15f * heartRate;
    avgSpo2 = 0.85f * avgSpo2 + 0.15f * spo2;
  }

  stressLevel = calculateStress(avgHeartRate, hrvEstimate, gsr, bodyTemp);

  ThingSpeak.setField(1, avgHeartRate);
  ThingSpeak.setField(2, avgSpo2);
  ThingSpeak.setField(3, bodyTemp);
  ThingSpeak.setField(4, gsr);
  ThingSpeak.setField(5, stressLevel);
  ThingSpeak.writeFields(THINGSPEAK_CHANNEL_ID, THINGSPEAK_WRITE_API_KEY);

  Serial.print("HR: ");
  Serial.println(avgHeartRate);
  Serial.print("SpO2: ");
  Serial.println(avgSpo2);
  Serial.print("Temp: ");
  Serial.println(bodyTemp);
  Serial.print("GSR: ");
  Serial.println(gsr);
  Serial.print("Stress: ");
  Serial.println(stressLevel);
  Serial.println("------------------");

  delay(5000);
}
