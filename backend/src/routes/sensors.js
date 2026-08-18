const express = require('express');
const webpush = require('web-push');
const SensorReading = require('../models/SensorReading');
const PushSubscription = require('../models/PushSubscription');
const SystemSettings = require('../models/SystemSettings');
const MotorState = require('../models/MotorState');

const router = express.Router();

// Shared device ID used as the singleton motor state key
const DEVICE_ID = 'pond-motor-01';

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
const VALID_TYPES = ['temperature', 'turbidity', 'ph', 'rain'];

// ─── Rain & Oxygen Motor Automation ─────────────────────────────────────────
async function handleRainMotorAutomation(value, req) {
  try {
    const settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
    const threshold = settings?.rainThreshold ?? 40;
    const autoEnabled = settings?.autoOxygenOnRain ?? true;

    if (!autoEnabled) return;

    let state = await MotorState.findOne({ deviceId: DEVICE_ID });
    if (!state) state = await MotorState.create({ deviceId: DEVICE_ID, speed: 100 });

    // If manual override is active (user manually turned ON the motor), do not let weather sensor turn it off
    if (state.manualOverride) {
      return;
    }

    if (value >= threshold) {
      if (!state.enabled) {
        state.enabled = true;
        state.speed = 100;
        state.manualOverride = false;
        await state.save();
        console.log(`[Rain Automation] Rain ${value.toFixed(1)}% >= ${threshold}%. Oxygen dissolving motor turned ON @ 100% (Auto Mode).`);
        const io = req?.app?.get('io');
        if (io) {
          io.emit('motor:update', {
            enabled: state.enabled,
            connectionActive: state.connectionActive,
            speed: 100,
            manualOverride: false,
            triggeredBy: 'rain_auto',
          });
        }
      }
    } else {
      if (state.enabled) {
        state.enabled = false;
        state.manualOverride = false;
        await state.save();
        console.log(`[Rain Automation] Rain ${value.toFixed(1)}% < ${threshold}%. Oxygen dissolving motor turned OFF (Auto Mode).`);
        const io = req?.app?.get('io');
        if (io) {
          io.emit('motor:update', {
            enabled: state.enabled,
            connectionActive: state.connectionActive,
            speed: state.speed,
            manualOverride: false,
            triggeredBy: 'rain_auto',
          });
        }
      }
    }
  } catch (err) {
    console.error('[Rain Automation Error]', err.message);
  }
}

// ─── POST /api/sensors/batch ───────────────────────────────────────────────
// High-performance batch endpoint: pushes all telemetry in a single fast HTTP call
router.post('/batch', async (req, res) => {
  const { deviceId = 'pond-01', readings = [] } = req.body;
  if (!Array.isArray(readings) || readings.length === 0) {
    return res.status(400).json({ error: '`readings` must be a non-empty array' });
  }

  const validDocs = [];
  const now = new Date();
  const io = req.app.get('io');

  for (const item of readings) {
    if (item.type && item.value !== undefined && VALID_TYPES.includes(item.type)) {
      const doc = {
        type: item.type,
        value: Number(item.value),
        unit: item.unit || '',
        deviceId,
        recordedAt: now,
      };
      validDocs.push(doc);

      if (io) {
        io.emit('sensor:update', doc);
      }

      if (item.type === 'rain') {
        handleRainMotorAutomation(doc.value, req).catch((err) => {
          console.error('[Rain Automation Error]', err.message);
        });
      }

      checkThresholdsAndNotify(item.type, doc.value).catch((err) => {
        console.error('[Web Push Error]', err.message);
      });
    }
  }

  if (validDocs.length > 0) {
    await SensorReading.insertMany(validDocs);
  }

  res.status(201).json({ success: true, count: validDocs.length });
});

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

  // Broadcast to all Socket.IO clients
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

  // Handle rain-triggered oxygen pump automation
  if (reading.type === 'rain') {
    handleRainMotorAutomation(reading.value, req).catch((err) => {
      console.error('[Rain Automation Error]', err.message);
    });
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
      const turbidityLimit = settings.turbidityMax ?? 60;
      if (value >= turbidityLimit) {
        shouldAlert = true;
        alertMessage = `High Turbidity alarm! Pond water turbidity reached ${value.toFixed(1)} NTU (Limit: ${turbidityLimit} NTU). Water clarity degraded.`;
      }
    } else if (type === 'rain') {
      const rainLimit = settings.rainThreshold ?? 40;
      if (value >= rainLimit) {
        shouldAlert = true;
        alertMessage = `Rain alarm! Rain level reached ${value.toFixed(0)}% (Limit: ${rainLimit}%). Oxygen dissolving motor activated.`;
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
        if (err.statusCode === 410 || err.statusCode === 404) {
          PushSubscription.deleteOne({ _id: sub._id }).catch(console.error);
        }
      });
    }
  }
}

// ─── GET /api/sensors/readings ─────────────────────────────────────────────
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

  res.json(readings.reverse());
});

// ─── GET /api/sensors/latest ───────────────────────────────────────────────
router.get('/latest', async (req, res) => {
  const [tempReading, turbidityReading, phReading, rainReading] =
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
    ]);

  res.json({
    temperature: tempReading  || null,
    turbidity:   turbidityReading || null,
    ph:          phReading    || null,
    rain:        rainReading  || null,
  });
});

module.exports = router;
