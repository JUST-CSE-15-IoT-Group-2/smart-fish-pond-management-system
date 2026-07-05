/*  ============================================================
    FPMS — Fish Pond Management System
    ESP32 Node  v5.4

    Feeder Motor  → GPIO 23
    Oxygen Pump   → GPIO 22

    Sensors:
      GPIO  4  DS18B20 temperature
      GPIO 34  pH (analog)
      GPIO 33  Turbidity (analog, 0–100 NTU)
      GPIO 32  Raindrop (analog)

    PIN RULE:
      Turn ON  →  pinMode(pin, OUTPUT);  digitalWrite(pin, LOW);
      Turn OFF →  pinMode(pin, INPUT);   // abandon pin, relay drops
    ============================================================ */

#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>
#include <time.h>

const char* WIFI_SSID     = "RAIHAN";
const char* WIFI_PASSWORD = "32145678";

const char* BACKEND_IP  = "192.168.104.15";   // ← PC's LAN IP (run `ipconfig` to check)
const char* SENSOR_URL  = "http://"+BACKEND_IP+":5000/api/sensors/reading";
const char* MOTOR_URL   = "http://"+BACKEND_IP+":5000/api/controls/motor";
const char* FEEDING_URL = "http://"+BACKEND_IP+":5000/api/controls/feeding/state";
const char* DEVICE_ID   = "pond-01";

// ── Pin numbers ───────────────────────────────────────────────
#define FEEDER_PIN    23
#define OXYGEN_PIN    22
#define TEMP_PIN       4
#define PH_PIN        34
#define TURBIDITY_PIN 33   // Analog input (0–100 NTU)
#define RAIN_PIN      32

// ── DS18B20 ───────────────────────────────────────────────────
OneWire oneWire(TEMP_PIN);
DallasTemperature tempSensor(&oneWire);

// ── Timing ────────────────────────────────────────────────────
unsigned long lastSensorTime = 0;
unsigned long lastPollTime   = 0;

// ── Motor states ──────────────────────────────────────────────
bool feederIsOn = false;
bool oxygenIsOn = false;

// ── Feeder schedule tracking ──────────────────────────────────
bool feederRunning       = false;
unsigned long feederOnAt = 0;
int feederDurationMs     = 60000;

// ─────────────────────────────────────────────────────────────
// Print what the motors are doing right now
// ─────────────────────────────────────────────────────────────
void printMotorStatus() {
  Serial.println("------ Motor Status ------");
  if (oxygenIsOn) {
    Serial.println("Oxygen Pump (GPIO 22) : ON");
  } else {
    Serial.println("Oxygen Pump (GPIO 22) : OFF");
  }
  if (feederIsOn) {
    Serial.println("Feeder      (GPIO 23) : ON");
  } else {
    Serial.println("Feeder      (GPIO 23) : OFF");
  }
  Serial.println("--------------------------");
}

// ─────────────────────────────────────────────────────────────
// ADC average
// ─────────────────────────────────────────────────────────────
int readADCAvg(int pin) {
  long total = 0;
  for (int i = 0; i < 10; i++) {
    total += analogRead(pin);
    delay(4);
  }
  return total / 10;
}

// ─────────────────────────────────────────────────────────────
// POST one sensor value to backend
// ─────────────────────────────────────────────────────────────
int postReading(const char* type, float value, const char* unit) {
  HTTPClient http;
  http.begin(SENSOR_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000); // 5 second timeout
  String body = "{\"type\":\"";
  body += type;
  body += "\",\"value\":";
  body += String(value, 2);
  body += ",\"unit\":\"";
  body += unit;
  body += "\",\"deviceId\":\"";
  body += DEVICE_ID;
  body += "\"}";
  int code = http.POST(body);
  http.end();

  Serial.print("  POST ");
  Serial.print(type);
  Serial.print(" → HTTP ");
  Serial.println(code); // 201=OK, -1=timeout/no connection
  return code;
}

// ─────────────────────────────────────────────────────────────
// GET JSON from a URL
// ─────────────────────────────────────────────────────────────
bool getJson(const char* url, JsonDocument& doc) {
  HTTPClient http;
  http.begin(url);
  int code = http.GET();
  if (code != 200) {
    http.end();
    return false;
  }
  DeserializationError err = deserializeJson(doc, http.getString());
  http.end();
  return (err == DeserializationError::Ok);
}

// ─────────────────────────────────────────────────────────────
// Convert "08:00 AM" to minutes since midnight
// ─────────────────────────────────────────────────────────────
int timeStringToMinutes(const char* s) {
  int h = 0;
  int m = 0;
  char ap[3] = "AM";
  if (sscanf(s, "%d:%d %2s", &h, &m, ap) != 3) {
    return -1;
  }
  if (strcmp(ap, "PM") == 0 && h != 12) h += 12;
  if (strcmp(ap, "AM") == 0 && h == 12) h = 0;
  return h * 60 + m;
}

// ─────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("=== FPMS v5.3 starting ===");

  // Abandon both motor pins at boot — relay coils are dead
  pinMode(FEEDER_PIN, INPUT);
  feederIsOn = false;
  Serial.println("GPIO 23 (Feeder)      → INPUT at boot (OFF)");

  pinMode(OXYGEN_PIN, INPUT);
  oxygenIsOn = false;
  Serial.println("GPIO 22 (Oxygen Pump) → INPUT at boot (OFF)");

  printMotorStatus();

  // Turbidity is digital input
  pinMode(TURBIDITY_PIN, INPUT);

  // Start temperature sensor
  tempSensor.begin();
  Serial.println("DS18B20 ready on GPIO 4");

  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);           // Station mode only — required for hotspot connection
  WiFi.setAutoReconnect(true);   // ESP32 handles reconnects internally
  WiFi.disconnect(false);        // Clear stale connection state
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected! IP: ");
    Serial.println(WiFi.localIP());
    configTime(6 * 3600, 0, "pool.ntp.org", "time.nist.gov");
    Serial.println("NTP time sync started (UTC+6)");
  } else {
    int wifiStatus = WiFi.status();
    Serial.print("WiFi FAILED! Status code: ");
    Serial.println(wifiStatus);
    Serial.print("  Meaning: ");
    switch (wifiStatus) {
      case 0:  Serial.println("WL_IDLE_STATUS — WiFi is idle. Try reset."); break;
      case 1:  Serial.println("WL_NO_SSID_AVAIL — Hotspot 'HONOR' NOT FOUND. Check hotspot name (case-sensitive) or 2.4GHz band."); break;
      case 2:  Serial.println("WL_SCAN_COMPLETED — Scan done but not connected."); break;
      case 3:  Serial.println("WL_CONNECTED — Connected (should not reach here)."); break;
      case 4:  Serial.println("WL_CONNECT_FAILED — WRONG PASSWORD or auth failure."); break;
      case 5:  Serial.println("WL_CONNECTION_LOST — Connection was established then lost."); break;
      case 6:  Serial.println("WL_DISCONNECTED — Hotspot is 5GHz (ESP32 only supports 2.4GHz). Fix: set hotspot to 2.4GHz band."); break;
      default: Serial.println("Unknown status."); break;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Loop
// ─────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // ════════════════════════════════════════════════
  // WIFI RECONNECT — only if disconnected, once per 30s
  // (WiFi.setAutoReconnect handles most cases automatically;
  //  this is a fallback for stubborn disconnections)
  // ════════════════════════════════════════════════
  static unsigned long lastWifiAttempt = 0;
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiAttempt >= 30000) {
      lastWifiAttempt = now;
      Serial.println("[WIFI] Disconnected — attempting reconnect...");
      WiFi.disconnect();
      delay(100);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      // Wait up to 10s
      int retries = 0;
      while (WiFi.status() != WL_CONNECTED && retries < 20) {
        delay(500);
        retries++;
      }
      if (WiFi.status() == WL_CONNECTED) {
        Serial.print("[WIFI] Reconnected! IP: ");
        Serial.println(WiFi.localIP());
      } else {
        Serial.print("[WIFI] Reconnect failed (status=");
        Serial.print(WiFi.status());
        Serial.println("). Retry in 30s.");
      }
    }
  }

  // ════════════════════════════════════════════════
  // SENSOR BLOCK — runs every 3 seconds
  // ════════════════════════════════════════════════
  if (now - lastSensorTime >= 3000) {
    lastSensorTime = now;
    Serial.println("================================");

    // Temperature
    tempSensor.requestTemperatures();
    float tempC = tempSensor.getTempCByIndex(0);
    if (tempC == DEVICE_DISCONNECTED_C) {
      Serial.println("TEMP: sensor disconnected");
    } else {
      Serial.print("TEMP: ");
      Serial.print(tempC);
      Serial.println(" C");
      if (WiFi.status() == WL_CONNECTED) {
        postReading("temperature", tempC, "C");
      }
    }

    // pH Calibration
    // 1. Put the probe in a pH 7.0 buffer solution (or clean tap water).
    // 2. Adjust the offset potentiometer on the module until the Serial Monitor prints V ≈ 2.000V.
    // 3. If you can't get exactly 2.000V, edit the PH_7_VOLTAGE constant below to match the printed voltage.
    const float PH_7_VOLTAGE = 2.000f; 
    int phRaw   = readADCAvg(PH_PIN);
    float phV   = phRaw * (3.3f / 4095.0f);
    float phVal = 7.0f + (PH_7_VOLTAGE - phV) * 5.70f;
    phVal = constrain(phVal, 0.0f, 14.0f);

    Serial.print("PH:   ADC=");
    Serial.print(phRaw);
    Serial.print(" V=");
    Serial.print(phV, 3);
    Serial.print(" pH=");
    Serial.print(phVal, 2);
    if (phVal < 6.5) {
      Serial.println(" (ACIDIC)");
    } else if (phVal <= 8.5) {
      Serial.println(" (OPTIMAL)");
    } else {
      Serial.println(" (ALKALINE)");
    }
    if (WiFi.status() == WL_CONNECTED) {
      postReading("ph", phVal, "pH");
    }

    // Turbidity — analog on GPIO 33
    // Lower ADC = clearer water (most turbidity sensors: higher voltage = clearer)
    // Map ADC 0–4095 → NTU 100–0 (inverted: 0 ADC = max turbid, 4095 = clear)
    int   turbRaw = readADCAvg(TURBIDITY_PIN);
    float turbV   = turbRaw * (3.3f / 4095.0f);
    float turbNTU = constrain((1.0f - (turbRaw / 4095.0f)) * 100.0f, 0.0f, 100.0f);
    Serial.print("TURB: ADC=");
    Serial.print(turbRaw);
    Serial.print(" V=");
    Serial.print(turbV, 3);
    Serial.print(" NTU=");
    Serial.print(turbNTU, 1);
    if (turbNTU < 20.0f) {
      Serial.println("  [CLEAR]");
    } else if (turbNTU < 60.0f) {
      Serial.println("  [MODERATE]");
    } else {
      Serial.println("  [TURBID]");
    }
    if (WiFi.status() == WL_CONNECTED) {
      postReading("turbidity", turbNTU, "NTU");
    }

    // Rain
    int rainRaw   = readADCAvg(RAIN_PIN);
    float wetness = ((4095.0f - rainRaw) / 4095.0f) * 100.0f;
    Serial.print("RAIN: ");
    Serial.print(wetness);
    if (wetness < 5.0) {
      Serial.println("% (DRY)");
    } else if (wetness < 30.0) {
      Serial.println("% (LIGHT RAIN)");
    } else if (wetness < 60.0) {
      Serial.println("% (MODERATE RAIN)");
    } else {
      Serial.println("% (HEAVY RAIN)");
    }
    if (WiFi.status() == WL_CONNECTED) {
      postReading("rain", wetness, "%");
    }

    // Always print motor status after sensor readings
    printMotorStatus();
  }

  // ════════════════════════════════════════════════
  // ACTUATOR POLL BLOCK — runs every 3 seconds
  // ════════════════════════════════════════════════
  if (WiFi.status() == WL_CONNECTED && now - lastPollTime >= 3000) {
    lastPollTime = now;

    // ────────────────────────────────────────────
    // OXYGEN PUMP — GPIO 22
    // ────────────────────────────────────────────
    JsonDocument oxygenDoc;
    if (getJson(MOTOR_URL, oxygenDoc)) {

      bool enabled    = oxygenDoc["enabled"]          | false;
      bool connActive = oxygenDoc["connectionActive"] | true;

      if (enabled == true && connActive == true) {
        // Backend says pump should be ON
        if (oxygenIsOn == false) {
          // It is currently OFF, so turn it ON
          pinMode(OXYGEN_PIN, OUTPUT);
          digitalWrite(OXYGEN_PIN, LOW);
          oxygenIsOn = true;
          Serial.println("OXYGEN: GPIO 22 → OUTPUT LOW → Pump turned ON");
          printMotorStatus();
        }
      } else {
        // Backend says pump should be OFF
        if (oxygenIsOn == true) {
          // It is currently ON, so turn it OFF and abandon the pin
          pinMode(OXYGEN_PIN, INPUT);
          oxygenIsOn = false;
          Serial.println("OXYGEN: GPIO 22 → INPUT → Pump turned OFF (pin abandoned)");
          printMotorStatus();
        }
      }
    }

    // ────────────────────────────────────────────
    // FEEDER MOTOR — GPIO 23
    // ────────────────────────────────────────────
    JsonDocument feederDoc;
    if (getJson(FEEDING_URL, feederDoc)) {

      bool manualMode   = feederDoc["manualMode"]      | false;
      bool manualActive = feederDoc["manualActive"]    | false;
      int  durMin       = feederDoc["durationMinutes"] | 1;
      feederDurationMs  = durMin * 60 * 1000;

      if (manualMode == true) {
        // ── MANUAL MODE ────────────────────────────
        if (manualActive == true) {
          // Backend wants feeder ON
          if (feederIsOn == false) {
            // Currently OFF, turn it ON
            pinMode(FEEDER_PIN, OUTPUT);
            digitalWrite(FEEDER_PIN, LOW);
            feederIsOn = true;
            Serial.println("FEEDER: GPIO 23 → OUTPUT LOW → Feeder turned ON (manual)");
            printMotorStatus();
          }
        } else {
          // Backend wants feeder OFF
          if (feederIsOn == true) {
            // Currently ON, turn it OFF and abandon the pin
            pinMode(FEEDER_PIN, INPUT);
            feederIsOn = false;
            Serial.println("FEEDER: GPIO 23 → INPUT → Feeder turned OFF (manual, pin abandoned)");
            printMotorStatus();
          }
        }

      } else {
        // ── SCHEDULED MODE ─────────────────────────

        // If feeder is running, check if the time duration is done
        if (feederRunning == true) {
          unsigned long timeRunning = millis() - feederOnAt;
          if (timeRunning >= (unsigned long)feederDurationMs) {
            // Duration finished, turn feeder OFF and abandon pin
            pinMode(FEEDER_PIN, INPUT);
            feederIsOn    = false;
            feederRunning = false;
            Serial.print("FEEDER: GPIO 23 → INPUT → Feeder turned OFF (scheduled, ran ");
            Serial.print(durMin);
            Serial.println(" min, pin abandoned)");
            printMotorStatus();
          }
        }

        // If feeder is not running, check if now matches a scheduled time
        if (feederRunning == false) {
          struct tm timeInfo;
          if (getLocalTime(&timeInfo)) {
            int nowMinutes = timeInfo.tm_hour * 60 + timeInfo.tm_min;
            JsonArray scheduledTimes = feederDoc["times"];
            for (JsonVariant entry : scheduledTimes) {
              int scheduledMinutes = timeStringToMinutes(entry.as<const char*>());
              if (scheduledMinutes >= 0 && nowMinutes == scheduledMinutes && timeInfo.tm_sec < 30) {
                // This is the right time, turn feeder ON
                pinMode(FEEDER_PIN, OUTPUT);
                digitalWrite(FEEDER_PIN, LOW);
                feederIsOn    = true;
                feederRunning = true;
                feederOnAt    = millis();
                Serial.print("FEEDER: GPIO 23 → OUTPUT LOW → Feeder turned ON (scheduled, will run ");
                Serial.print(durMin);
                Serial.println(" min)");
                printMotorStatus();
                break;
              }
            }
          }
        }

        // Print current scheduled feeder state every poll
        if (feederRunning == true) {
          Serial.println("FEEDER: scheduled run in progress...");
        } else {
          Serial.println("FEEDER: scheduled, waiting for next time slot...");
        }
      }
    }
  }
}
