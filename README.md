# Smart Fish Pond Management System

## Tech Stack

**Frontend**
- Next.js 16
- Tailwind CSS
- Socket.IO Client (real-time updates)

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- Passport.js (Google OAuth 2.0) + JWT sessions
- Socket.IO

**Microcontroller**
- ESP32 Development Board (Wi-Fi, 2.4GHz only)

**Sensors**
- DS18B20 — water temperature
- Analog pH sensor
- Analog turbidity sensor
- Analog raindrop sensor

**Actuators**
- Relay-controlled oxygen pump (aeration)
- Relay-controlled feeder motor
- Servo-driven feeder gate

## Repository Layout

```
backend/    Express API, MongoDB models, Socket.IO server
frontend/   Next.js dashboard
esp32/      ESP32 firmware (esp_code.ino) + engineering guide
docs/       User manual and screenshots
```

## Prerequisites

- A computer/server to run the backend that stays on permanently, ideally with a public IP/domain so the dashboard is reachable over the internet.
- An ESP32 with the sensors and actuators wired up.
- A Wi-Fi router reachable by both the server and the ESP32 — **the ESP32 only supports 2.4GHz Wi-Fi, not 5GHz.**
- Node.js and MongoDB installed on the server.

![Hardware setup](docs/assets/hardware-setup.jpg)

## How to Run

### 1. Backend

```bash
cd backend
cp .env.example .env   # fill in your own values
npm install
npm run dev
```

Key variables in `backend/.env`:

| Variable | Purpose |
|---|---|
| `PORT` | Port the API listens on |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Session token signing |
| `AUTH_USER_ID`, `AUTH_PASSWORD`, `AUTH_USER_NAME` | Default login credentials, synced to MongoDB on startup |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth 2.0 login |
| `FRONTEND_URL` | Frontend origin, used for CORS and post-login redirect |

Keep this process running at all times — if it stops, the dashboard loses its live connection and the ESP32 can't send readings or receive commands. Deploy it somewhere reachable from the internet and note its address; the ESP32 and the frontend both need it.

### 2. ESP32 Firmware

1. Open `esp32/esp_code/esp_code.ino` in the Arduino IDE.
2. Edit `WIFI_SSID` / `WIFI_PASSWORD` for your network.
3. Edit `BACKEND_IP` / `BACKEND_PORT` to point at the backend server from step 1.
4. Upload to the ESP32 over USB.
5. Open the Serial Monitor to confirm it joins Wi-Fi and starts printing sensor readings.

Pin reference (from the firmware):

| Function | Pin |
|---|---|
| Feeder relay | GPIO 23 |
| Oxygen pump relay | GPIO 22 |
| DS18B20 temperature | GPIO 4 |
| pH sensor (analog) | GPIO 34 |
| Turbidity sensor (analog) | GPIO 33 |
| Raindrop sensor (analog) | GPIO 32 |
| Feeder gate servo | GPIO 21 |

If the ESP32 can't find your Wi-Fi, double-check the SSID is typed exactly and that the router is broadcasting 2.4GHz.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local` with:

`frontend/.env.local`:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL of the backend from step 1 |

Log in with the credentials set in `backend/.env` (`AUTH_USER_ID` / `AUTH_PASSWORD`), or via Google if OAuth is configured.

![Landing page](docs/assets/landing-page.png)

## How to Use

The dashboard has four sections in the side menu: **Updates**, **Controls**, **Settings**, **Account**.

### Updates

Live view of the pond — water temperature, pH, turbidity, and rainfall, updating in real time over Socket.IO, plus trend charts. A reading outside its safe range changes the card's color and can trigger a push notification.

![Updates page](docs/assets/updates-page.png)
![Updates page — trend charts](docs/assets/updates-page-2.png)

### Controls

Manage the feeder and oxygen pump.

- **Feeding schedule** — add/remove times of day the feeder runs automatically, and set the run duration per feeding.
- **Manual mode** — take direct control of the feeder with on/off buttons instead of the schedule.
- **Oxygen pump** — toggle on/off and set speed via slider or presets. It also auto-starts when the rain sensor crosses the threshold configured in Settings, and stops when it drops back below.
- **Link controller** — kill the connection to force an immediate fail-safe shutdown of all actuators; reconnect to resume.

![Controls page](docs/assets/controls-page.png)
![Feeding schedule](docs/assets/feeding-schedule.png)

### Settings

Configure alarm thresholds (min/max temperature, pH range, max turbidity, rain alarm limit), the rain trigger threshold that drives automatic oxygen pump activation, and push notifications for out-of-range alerts.

![Settings page](docs/assets/settings-page.png)

### Account

Profile info and the API key (`X-API-Key`) used by IoT devices to authenticate `POST` requests to the sensor-reading endpoint.

![Account page](docs/assets/account-page.png)

## Troubleshooting

- **No new readings** — confirm the server/backend is running and the ESP32 is powered and connected to Wi-Fi.
- **Feeder or pump not responding** — check the connection link on the Controls page isn't killed; reconnect if it is.
- **Not receiving notifications** — allow notifications for the dashboard in your browser/phone settings and enable alerts on the Settings page.
- **ESP32 won't connect to Wi-Fi** — verify the SSID/password in the firmware and that the router is on 2.4GHz (the ESP32 cannot use 5GHz).
