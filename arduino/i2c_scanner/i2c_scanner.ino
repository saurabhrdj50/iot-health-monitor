/*
 * ============================================================
 *  I2C Scanner for ESP8266 NodeMCU
 * ============================================================
 *  Upload this sketch to verify that the MAX30102 (or any I2C
 *  device) is properly wired and detected on the bus.
 *
 *  Expected output for this project:
 *    - 0x57 → MAX30102 Pulse Oximeter
 *
 *  Wiring:
 *    SDA → D2 (GPIO4)
 *    SCL → D1 (GPIO5)
 * ============================================================
 */

#include <Wire.h>

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000) { yield(); }

  Serial.println();
  Serial.println("===========================");
  Serial.println("  I2C Scanner — ESP8266");
  Serial.println("  SDA=D2(GPIO4) SCL=D1(GPIO5)");
  Serial.println("===========================");
  Serial.println();

  Wire.begin(4, 5);  // SDA = GPIO4 (D2), SCL = GPIO5 (D1)
  Wire.setClock(100000);
}

void loop() {
  int devicesFound = 0;

  Serial.println("Scanning I2C bus...");

  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("  ✔ Device found at 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);

      // Identify known devices
      if (address == 0x57) {
        Serial.print("  ← MAX30102 Pulse Oximeter");
      } else if (address == 0x76 || address == 0x77) {
        Serial.print("  ← BME280/BMP280 (if present)");
      } else if (address == 0x3C || address == 0x3D) {
        Serial.print("  ← OLED Display (if present)");
      }

      Serial.println();
      devicesFound++;
    } else if (error == 4) {
      Serial.print("  ✘ Unknown error at 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
    }

    yield();  // Feed watchdog
  }

  Serial.println();
  if (devicesFound == 0) {
    Serial.println("No I2C devices found!");
    Serial.println("Check wiring: SDA→D2, SCL→D1, VCC→3.3V, GND→GND");
  } else {
    Serial.print("Found ");
    Serial.print(devicesFound);
    Serial.println(" device(s).");
  }

  Serial.println();
  Serial.println("--- Next scan in 5 seconds ---");
  Serial.println();

  delay(5000);
}
