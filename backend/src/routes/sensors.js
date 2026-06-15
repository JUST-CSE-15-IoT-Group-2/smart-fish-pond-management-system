const express = require('express');
const SensorReading = require('../models/SensorReading');

const router = express.Router();

// ─── POST /api/sensors/reading ─────────────────────────────────────────────
// Used by IoT devices (ESP32, Raspberry Pi, etc.) to push new readings.
// PUBLIC — no authentication required.
// After saving, broadcasts a Socket.IO event to all connected dashboard clients.
router.post('/reading', async (req, res) => {
  const { type, value, unit = '', deviceId = 'pond-01' } = req.body;

  if (!type || value === undefined) {
    return res.status(400).json({ error: '`type` and `value` are required' });
  }

  if (!['temperature', 'clarity'].includes(type)) {
    return res.status(400).json({ error: '`type` must be "temperature" or "clarity"' });
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

  res.status(201).json(reading);
});

// ─── GET /api/sensors/readings ─────────────────────────────────────────────
// Returns historical readings for graphing.
// Query params:
//   type=temperature|clarity  (required)
//   limit=N                   (default 24, max 168 = 1 week of hourly data)
// PUBLIC — no authentication required.
router.get('/readings', async (req, res) => {
  const { type, limit = 24 } = req.query;

  if (!type || !['temperature', 'clarity'].includes(type)) {
    return res.status(400).json({ error: '`type` query param must be "temperature" or "clarity"' });
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
  const [tempReading, clarityReading] = await Promise.all([
    SensorReading.findOne({ type: 'temperature' })
      .sort({ recordedAt: -1 })
      .select('value unit recordedAt -_id'),
    SensorReading.findOne({ type: 'clarity' })
      .sort({ recordedAt: -1 })
      .select('value unit recordedAt -_id'),
  ]);

  res.json({
    temperature: tempReading || null,
    clarity: clarityReading || null,
  });
});

module.exports = router;
