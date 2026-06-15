const express = require('express');
const FeedingSchedule = require('../models/FeedingSchedule');
const MotorState = require('../models/MotorState');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Shared device ID used as the singleton motor state key
const DEVICE_ID = 'pond-motor-01';

// ─── PUBLIC: Motor Status (read-only) ──────────────────────────────────────
// GET /api/controls/motor/status
router.get('/motor/status', async (req, res) => {
  const state = await MotorState.findOne({ deviceId: DEVICE_ID });
  if (!state) {
    return res.json({ enabled: false, connectionActive: true, speed: 0, status: 'STOPPED' });
  }
  res.json({
    enabled: state.enabled,
    connectionActive: state.connectionActive,
    speed: state.speed,
    status: state.enabled ? 'RUNNING' : 'STOPPED',
    updatedAt: state.updatedAt,
  });
});

// ─── PUBLIC: Motor Control (read + write) ──────────────────────────────────
// GET /api/controls/motor
router.get('/motor', async (req, res) => {
  let state = await MotorState.findOne({ deviceId: DEVICE_ID });
  if (!state) {
    state = await MotorState.create({ deviceId: DEVICE_ID });
  }
  res.json({ enabled: state.enabled, connectionActive: state.connectionActive, speed: state.speed });
});

// PUT /api/controls/motor
// Body: { enabled: Boolean, connectionActive: Boolean, speed: Number (0-100) }
router.put('/motor', async (req, res) => {
  const update = {};
  if (typeof req.body.enabled === 'boolean') update.enabled = req.body.enabled;
  if (typeof req.body.connectionActive === 'boolean') update.connectionActive = req.body.connectionActive;
  if (req.body.speed !== undefined) {
    const speed = Number(req.body.speed);
    if (isNaN(speed) || speed < 0 || speed > 100) {
      return res.status(400).json({ error: '`speed` must be a number between 0 and 100' });
    }
    update.speed = Math.round(speed);
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'Provide at least one of: `enabled`, `connectionActive`, `speed`' });
  }

  // If connection goes offline, motor must stop
  if (update.connectionActive === false) {
    update.enabled = false;
  }

  // If motor is explicitly disabled, leave speed unchanged

  const state = await MotorState.findOneAndUpdate(
    { deviceId: DEVICE_ID },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Broadcast via Socket.IO
  const io = req.app.get('io');
  if (io) {
    io.emit('motor:update', {
      enabled: state.enabled,
      connectionActive: state.connectionActive,
      speed: state.speed,
    });
  }

  res.json({ enabled: state.enabled, connectionActive: state.connectionActive, speed: state.speed });
});

// ─── Auth-protected routes below ───────────────────────────────────────────
router.use(requireAuth);

// ─── Feeding Schedule ──────────────────────────────────────────────────────

// GET /api/controls/feeding
router.get('/feeding', async (req, res) => {
  let schedule = await FeedingSchedule.findOne({ userId: req.user._id });
  if (!schedule) {
    schedule = await FeedingSchedule.create({ userId: req.user._id });
  }
  res.json({ times: schedule.times });
});

// PUT /api/controls/feeding
router.put('/feeding', async (req, res) => {
  const { times } = req.body;

  if (!Array.isArray(times)) {
    return res.status(400).json({ error: '`times` must be an array of time strings' });
  }

  const schedule = await FeedingSchedule.findOneAndUpdate(
    { userId: req.user._id },
    { times },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ times: schedule.times });
});

module.exports = router;
