const express = require('express');
const webpush = require('web-push');
const SensorReading = require('../models/SensorReading');
const PushSubscription = require('../models/PushSubscription');
const SystemSettings = require('../models/SystemSettings');
const MotorState = require('../models/MotorState');
const FeedingSchedule = require('../models/FeedingSchedule');

const router = express.Router();

// Initialize web-push with VAPID credentials from environment
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@smartpond.local',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Push notification cooldown cache
const cooldowns = new Map();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown per sensor type per user

// All valid sensor types
const VALID_TYPES = ['temperature', 'turbidity', 'ph', 'rain', 'oxygen'];

// ─── POST /api/sensors/reading ─────────────────────────────────────────────
// Used by IoT devices (ESP32, Raspberry Pi, etc.) to push new readings.
// PUBLIC — no authentication required.
// After saving, broadcasts a Socket.IO event to all connected dashboard clients.
router.post('/reading', async (req, res) => {
  const { type, value, unit = '', deviceId = 'pond-01' } = req.body;

  if (!type || value === undefined) {
    return res.status(400).json({ error: '`type` and `value` are required' });
  }

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({
      error: `\`type\` must be one of: ${VALID_TYPES.join(', ')}`,
    });
  }

  const reading = await SensorReading.create({
    type,
    value: Number(value),
    unit,
    deviceId,
    recordedAt: new Date(),
  });

  // Broadcast to all Socket.IO clients (the io instance is attached to app in index.js)
  const io = req.app.get('io');
  if (io) {
    io.emit('sensor:update', {
      type: reading.type,
      value: reading.value,
      unit: reading.unit,
      deviceId: reading.deviceId,
      recordedAt: reading.recordedAt,
    });
  }

  // If rain sensor reading goes above 40%, pause feeder and turn ON oxygen motor
  if (reading.type === 'rain' && reading.value > 40.0) {
    console.log(`[Rain Trigger] Rain level ${reading.value}% is above 40%. Pausing feeder and enabling oxygen motor.`);
    try {
      // 1. Pause feeder: set manualMode to true and manualActive to false
      const schedule = await FeedingSchedule.findOneAndUpdate(
        {},
        { manualMode: true, manualActive: false },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (io) {
        io.emit('feeding:update', {
          times:           schedule.times,
          durationMinutes: schedule.durationMinutes,
          manualMode:      schedule.manualMode,
          manualActive:    schedule.manualActive,
        });
      }

      // 2. Turn oxygen motor ON (speed 100)
      const motor = await MotorState.findOneAndUpdate(
        { deviceId: 'pond-motor-01' },
        { enabled: true, speed: 100 },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (io) {
        io.emit('motor:update', {
          enabled:          motor.enabled,
          connectionActive: motor.connectionActive,
          speed:            motor.speed,
          autoMode:         motor.autoMode,
        });
      }
    } catch (err) {
      console.error('[Rain Trigger] Error executing rain-based actuator overrides:', err.message);
    }
  }

  // Trigger threshold evaluations and push alerts asynchronously
  checkThresholdsAndNotify(reading.type, reading.value).catch((err) => {
    console.error('[Web Push Error]', err.message);
  });

  res.status(201).json(reading);
});

// Asynchronous threshold validation and Web Push notification dispatcher
async function checkThresholdsAndNotify(type, value) {
  // 1. Fetch all push subscriptions from the DB
  const subscriptions = await PushSubscription.find({});
  if (subscriptions.length === 0) return;

  for (const sub of subscriptions) {
    // 2. Fetch the corresponding user's system alarm settings
    const settings = await SystemSettings.findOne({ userId: sub.userId });
    if (!settings) continue;

    let shouldAlert = false;
    let alertMessage = '';

    // Evaluate based on metric type
    if (type === 'temperature') {
      if (value < settings.tempMin) {
        shouldAlert = true;
        alertMessage = `Low temperature alarm! Pond temp dropped to ${value.toFixed(1)}°C (Limit: ${settings.tempMin}°C)`;
      } else if (value > settings.tempMax) {
        shouldAlert = true;
        alertMessage = `High temperature alarm! Pond temp reached ${value.toFixed(1)}°C (Limit: ${settings.tempMax}°C)`;
      }
    } else if (type === 'ph') {
      if (value < settings.phMin) {
        shouldAlert = true;
        alertMessage = `Acidic pH alarm! Pond pH has dropped to ${value.toFixed(2)} (Optimal min: ${settings.phMin})`;
      } else if (value > settings.phMax) {
        shouldAlert = true;
        alertMessage = `Alkaline pH alarm! Pond pH has reached ${value.toFixed(2)} (Optimal max: ${settings.phMax})`;
      }
    } else if (type === 'turbidity') {
      // Turbidity uses binary DO: DO=100 (turbid), DO=0 (clear)
      if (value >= 100) {
        shouldAlert = true;
        alertMessage = 'Water Turbidity warning! Pond water clarity has degraded below the safe threshold.';
      }
    } else if (type === 'oxygen') {
      if (value < settings.oxygenMin) {
        shouldAlert = true;
        alertMessage = `Low oxygen alarm! Dissolved oxygen dropped to ${value.toFixed(1)} mg/L (Limit: ${settings.oxygenMin} mg/L)`;
      }
    } else if (type === 'rain') {
      if (value >= settings.rainMax) {
        shouldAlert = true;
        alertMessage = `Wet weather warning: Heavy rain detected (${value.toFixed(0)}% wetness). Limit: ${settings.rainMax}%.`;
      }
    }

    if (shouldAlert) {
      // 3. Enforce rate limiting per user + metric type
      const cooldownKey = `${sub.userId}_${type}`;
      const lastAlert = cooldowns.get(cooldownKey);
      const now = Date.now();

      if (lastAlert && (now - lastAlert < COOLDOWN_MS)) {
        continue; // Rate limit active: skip sending
      }

      // Update cooldown timestamp
      cooldowns.set(cooldownKey, now);

      // 4. Construct payload and send Web Push
      const payload = JSON.stringify({
        title: `Pond Alert: ${type.toUpperCase()}`,
        body: alertMessage,
        url: '/dashboard/updates',
      });

      webpush.sendNotification(sub.subscription, payload).catch((err) => {
        console.error(`[Push Notification Failed] Subscription ID: ${sub._id}`, err.message);
        // Clean up stale or invalid subscriptions (HTTP 410 Gone indicates expired browser subscription)
        if (err.statusCode === 410 || err.statusCode === 404) {
          PushSubscription.deleteOne({ _id: sub._id }).catch(console.error);
        }
      });
    }
  }
}

// ─── GET /api/sensors/readings ─────────────────────────────────────────────
// Returns historical readings for graphing.
// Query params:
//   type=temperature|clarity|turbidity|ph|oxygen  (required)
//   limit=N                   (default 24, max 168 = 1 week of hourly data)
// PUBLIC — no authentication required.
router.get('/readings', async (req, res) => {
  const { type, limit = 24 } = req.query;

  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({
      error: `\`type\` query param must be one of: ${VALID_TYPES.join(', ')}`,
    });
  }

  const cap = Math.min(parseInt(limit) || 24, 168);

  const readings = await SensorReading.find({ type })
    .sort({ recordedAt: -1 })
    .limit(cap)
    .select('value unit recordedAt deviceId -_id');

  // Return chronological order (oldest first) so graph renders left-to-right
  res.json(readings.reverse());
});

// ─── GET /api/sensors/latest ───────────────────────────────────────────────
// Returns the single most recent reading for each sensor type.
// Used for the live "card" values on the Updates page.
// PUBLIC — no authentication required.
router.get('/latest', async (req, res) => {
  const [tempReading, turbidityReading, phReading, rainReading, oxygenReading] =
    await Promise.all([
      SensorReading.findOne({ type: 'temperature' })
        .sort({ recordedAt: -1 })
        .select('value unit recordedAt -_id'),
      SensorReading.findOne({ type: 'turbidity' })
        .sort({ recordedAt: -1 })
        .select('value unit recordedAt -_id'),
      SensorReading.findOne({ type: 'ph' })
        .sort({ recordedAt: -1 })
        .select('value unit recordedAt -_id'),
      SensorReading.findOne({ type: 'rain' })
        .sort({ recordedAt: -1 })
        .select('value unit recordedAt -_id'),
      SensorReading.findOne({ type: 'oxygen' })
        .sort({ recordedAt: -1 })
        .select('value unit recordedAt -_id'),
    ]);

  res.json({
    temperature: tempReading  || null,
    turbidity:   turbidityReading || null,
    ph:          phReading    || null,
    rain:        rainReading  || null,
    oxygen:      oxygenReading || null,
  });
});

module.exports = router;
