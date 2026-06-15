#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>

// ---------- MOTOR ----------
#define MOTOR_POWER_PIN_1 22   // L298N IN1
#define MOTOR_POWER_PIN_2 23   // L298N IN2
#define MOTOR_PWM_PIN 5        // L298N ENA

const char* motorStatusUrl =
"http://192.168.250.15:5000/api/controls/motor/status";

// ---------- WIFI ----------
const char* ssid = "HONOR";
const char* password = "61711825";

// ---------- PWM ----------
const int pwmFreq = 5000;
const int pwmResolution = 8;   // 0–255

// ---------- API ----------
const char* serverUrl =
"http://192.168.250.15:5000/api/sensors/reading";

// ---------- DS18B20 ----------
#define ONE_WIRE_BUS 4

OneWire oneWire(ONE_WIRE_BUS);

DallasTemperature sensors(
  &oneWire
);

void setup() {

  Serial.begin(115200);

  // DS18B20
  sensors.begin();

  // WiFi
  Serial.println("Connecting WiFi...");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected");
  Serial.println(WiFi.localIP());

  // ==========================
// MOTOR CONTROL (RELAY JQC3F)
// ==========================

#define RELAY_PIN 22   // JQC3F relay input pin

HTTPClient motorHttp;

motorHttp.begin(motorStatusUrl);

int code = motorHttp.GET();

Serial.print("Motor API: ");
Serial.println(code);

if (code == 200) {

  String response = motorHttp.getString();
  Serial.println(response);

  DynamicJsonDocument doc(512);

  if (deserializeJson(doc, response) == DeserializationError::Ok) {

    bool enabled = doc["enabled"];
    bool active  = doc["connectionActive"];

    if (enabled && active) {

      // MOTOR ON (Relay ON)
      digitalWrite(RELAY_PIN, HIGH);

      Serial.println("Motor ON (Relay)");

    } else {

      // MOTOR OFF (Relay OFF)
      digitalWrite(RELAY_PIN, LOW);

      Serial.println("Motor OFF (Relay)");
    }

  } else {
    Serial.println("JSON parse failed");
  }

} else {
  Serial.println("Motor API failed");
}

motorHttp.end();
}

void loop() {

  // ==========================
  // TEMPERATURE SEND
  // ==========================

  sensors.requestTemperatures();

  float tempC =
    sensors.getTempCByIndex(0);

  if (
    tempC !=
    DEVICE_DISCONNECTED_C
  ) {

    HTTPClient tempHttp;

    tempHttp.begin(serverUrl);

    tempHttp.addHeader(
      "Content-Type",
      "application/json"
    );

    String payload =
      "{"
      "\"type\":\"temperature\","
      "\"value\":" +
      String(tempC, 1) +
      ","
      "\"unit\":\"°C\","
      "\"deviceId\":\"pond-01\""
      "}";

    int result =
      tempHttp.POST(payload);

    Serial.print(
      "Temperature: "
    );

    Serial.println(tempC);

    Serial.print(
      "POST Result: "
    );

    Serial.println(result);

    tempHttp.end();
  }



  // ==========================
  // MOTOR CONTROL
  // ==========================

  HTTPClient motorHttp;

  motorHttp.begin(
    motorStatusUrl
  );

  int code =
    motorHttp.GET();

  Serial.print(
    "Motor API: "
  );

  Serial.println(code);

  if (code == 200) {

    String response =
      motorHttp.getString();

    Serial.println(
      response
    );

    DynamicJsonDocument doc(
      512
    );

    if (
      deserializeJson(
        doc,
        response
      ) ==
      DeserializationError::Ok
    ) {

      bool enabled =
        doc["enabled"];

      bool active =
        doc["connectionActive"];

      int speed =
        doc["speed"];

      speed =
        constrain(
          speed,
          0,
          255
        );

      if (
        enabled &&
        active
      ) {

        // Forward direction
        digitalWrite(
          MOTOR_POWER_PIN_1,
          HIGH
        );

        digitalWrite(
          MOTOR_POWER_PIN_2,
          LOW
        );

        ledcWrite(
          MOTOR_PWM_PIN,
          speed
        );

        Serial.print(
          "Motor ON Speed="
        );

        Serial.println(
          speed
        );

      } else {

        // Stop
        digitalWrite(
          MOTOR_POWER_PIN_1,
          LOW
        );

        digitalWrite(
          MOTOR_POWER_PIN_2,
          LOW
        );

        ledcWrite(
          MOTOR_PWM_PIN,
          0
        );

        Serial.println(
          "Motor OFF"
        );
      }

    } else {

      Serial.println(
        "JSON parse failed"
      );
    }

  } else {

    Serial.println(
      "Motor API failed"
    );
  }

  motorHttp.end();

  delay(3000);
}