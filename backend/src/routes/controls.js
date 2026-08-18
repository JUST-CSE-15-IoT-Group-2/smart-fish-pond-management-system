const express = require('express');
const FeedingSchedule = require('../models/FeedingSchedule');
const MotorState = require('../models/MotorState');

const router = express.Router();

// Shared device ID used as the singleton motor state key
const DEVICE_ID = 'pond-motor-01';

// ─── Helper: emit feeding update via Socket.IO ──────────────────────────────
function emitFeeding(req, schedule) {
  const io = req.app.get('io');
  if (io) {
    io.emit('feeding:update', {
      times:           schedule.times,
      durationMinutes: schedule.durationMinutes,
      manualMode:      schedule.manualMode,
      manualActive:    schedule.manualActive,
    });
  }
}

// ─── PUBLIC: Motor Status (read-only, used by ESP32) ───────────────────────
// GET /api/controls/motor/status
router.get('/motor/status', async (req, res) => {
  const state = await MotorState.findOne({ deviceId: DEVICE_ID });
  if (!state) {
    return res.json({ enabled: false, connectionActive: true, speed: 0, manualOverride: false, status: 'STOPPED' });
  }
  res.json({
    enabled:          state.enabled,
    connectionActive: state.connectionActive,
    speed:            state.speed,
    manualOverride:   state.manualOverride ?? false,
    status:           state.enabled ? 'RUNNING' : 'STOPPED',
    updatedAt:        state.updatedAt,
  });
});

// ─── PUBLIC: Motor Control (read + write, used by frontend & ESP32) ─────────
// GET /api/controls/motor
router.get('/motor', async (req, res) => {
  let state = await MotorState.findOne({ deviceId: DEVICE_ID });
  if (!state) state = await MotorState.create({ deviceId: DEVICE_ID, speed: 100 });
  res.json({
    enabled:          state.enabled,
    connectionActive: state.connectionActive,
    speed:            state.speed,
    manualOverride:   state.manualOverride ?? false,
  });
});

// PUT /api/controls/motor
// Body: { enabled: Boolean, connectionActive: Boolean, speed: Number (0-100), manualOverride: Boolean }
router.put('/motor', async (req, res) => {
  const update = {};
  if (typeof req.body.enabled === 'boolean') {
    update.enabled = req.body.enabled;
    // When user manually enables/disables motor from UI, set or clear manualOverride
    if (typeof req.body.manualOverride === 'boolean') {
      update.manualOverride = req.body.manualOverride;
    } else {
      update.manualOverride = req.body.enabled; // true when manually ON, false when manually OFF
    }
  } else if (typeof req.body.manualOverride === 'boolean') {
    update.manualOverride = req.body.manualOverride;
  }

  if (typeof req.body.connectionActive === 'boolean') update.connectionActive = req.body.connectionActive;
  if (req.body.speed !== undefined) {
    const speed = Number(req.body.speed);
    if (isNaN(speed) || speed < 0 || speed > 100) {
      return res.status(400).json({ error: '`speed` must be a number between 0 and 100' });
    }
    update.speed = Math.round(speed);
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'Provide at least one of: `enabled`, `connectionActive`, `speed`, `manualOverride`' });
  }

  // If connection goes offline, motor must stop and clear override
  if (update.connectionActive === false) {
    update.enabled = false;
    update.manualOverride = false;
  }

  const state = await MotorState.findOneAndUpdate(
    { deviceId: DEVICE_ID },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const io = req.app.get('io');
  if (io) {
    io.emit('motor:update', {
      enabled:          state.enabled,
      connectionActive: state.connectionActive,
      speed:            state.speed,
      manualOverride:   state.manualOverride ?? false,
    });
  }

  res.json({
    enabled:          state.enabled,
    connectionActive: state.connectionActive,
    speed:            state.speed,
    manualOverride:   state.manualOverride ?? false,
  });
});

// ─── PUBLIC: Feeding state (read-only, used by ESP32) ───────────────────────
// GET /api/controls/feeding/state
// Returns times, duration, manualMode, manualActive — no auth required so ESP32 can poll it.
router.get('/feeding/state', async (req, res) => {
  // Return a merged view across all users (or first doc found).
  // For a single-pond system this is effectively the one operator's schedule.
  const schedule = await FeedingSchedule.findOne().sort({ updatedAt: -1 });
  if (!schedule) {
    return res.json({
      times:           [],
      durationMinutes: 1,
      manualMode:      false,
      manualActive:    false,
    });
  }
  res.json({
    times:           schedule.times,
    durationMinutes: schedule.durationMinutes,
    manualMode:      schedule.manualMode,
    manualActive:    schedule.manualActive,
  });
});

// ─── Feeding Schedule (no auth required for LAN IoT operation) ──────────────

// Helper: get userId from cookie if available, otherwise null
const { requireAuth } = require('../middleware/auth');
const optionalAuth = async (req, res, next) => {
  // Try to extract user from cookie/token, but don't block if absent
  const jwt = require('jsonwebtoken');
  const User = require('../models/User');
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-__v');
    } catch (_) { /* ignore invalid token */ }
  }
  next();
};

router.use(optionalAuth);

// GET /api/controls/feeding  — full schedule
router.get('/feeding', async (req, res) => {
  // If authenticated, look up by userId; otherwise return latest schedule
  let schedule;
  if (req.user) {
    schedule = await FeedingSchedule.findOne({ userId: req.user._id });
    if (!schedule) schedule = await FeedingSchedule.create({ userId: req.user._id });
  } else {
    schedule = await FeedingSchedule.findOne().sort({ updatedAt: -1 });
  }
  if (!schedule) {
    return res.json({ times: [], durationMinutes: 1, manualMode: false, manualActive: false });
  }
  res.json({
    times:           schedule.times,
    durationMinutes: schedule.durationMinutes,
    manualMode:      schedule.manualMode,
    manualActive:    schedule.manualActive,
  });
});

// PUT /api/controls/feeding  — update scheduled times
router.put('/feeding', async (req, res) => {
  const { times } = req.body;
  if (!Array.isArray(times)) {
    return res.status(400).json({ error: '`times` must be an array of time strings' });
  }

  let query;
  if (req.user) {
    query = { userId: req.user._id };
  } else {
    // Find existing schedule or create one with a placeholder userId
    const existing = await FeedingSchedule.findOne().sort({ updatedAt: -1 });
    query = existing ? { _id: existing._id } : { userId: 'anonymous' };
  }

  const schedule = await FeedingSchedule.findOneAndUpdate(
    query,
    { times },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  emitFeeding(req, schedule);
  res.json({ times: schedule.times, durationMinutes: schedule.durationMinutes, manualMode: schedule.manualMode, manualActive: schedule.manualActive });
});

// PUT /api/controls/feeding/duration  — set how many minutes the feeder runs
router.put('/feeding/duration', async (req, res) => {
  const dur = Number(req.body.durationMinutes);
  if (isNaN(dur) || dur < 1 || dur > 60) {
    return res.status(400).json({ error: '`durationMinutes` must be 1–60' });
  }

  let query;
  if (req.user) {
    query = { userId: req.user._id };
  } else {
    const existing = await FeedingSchedule.findOne().sort({ updatedAt: -1 });
    query = existing ? { _id: existing._id } : { userId: 'anonymous' };
  }

  const schedule = await FeedingSchedule.findOneAndUpdate(
    query,
    { durationMinutes: Math.round(dur) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  emitFeeding(req, schedule);
  res.json({ durationMinutes: schedule.durationMinutes });
});

// PUT /api/controls/feeding/manual  — toggle manual vs scheduled mode
router.put('/feeding/manual', async (req, res) => {
  if (typeof req.body.manualMode !== 'boolean') {
    return res.status(400).json({ error: '`manualMode` must be a boolean' });
  }

  const update = { manualMode: req.body.manualMode };
  // When switching to scheduled mode, ensure feeder is off
  if (!req.body.manualMode) update.manualActive = false;

  let query;
  if (req.user) {
    query = { userId: req.user._id };
  } else {
    const existing = await FeedingSchedule.findOne().sort({ updatedAt: -1 });
    query = existing ? { _id: existing._id } : { userId: 'anonymous' };
  }

  const schedule = await FeedingSchedule.findOneAndUpdate(
    query,
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  emitFeeding(req, schedule);
  res.json({ manualMode: schedule.manualMode, manualActive: schedule.manualActive });
});

// PUT /api/controls/feeding/manual/active  — turn feeder on/off in manual mode
router.put('/feeding/manual/active', async (req, res) => {
  if (typeof req.body.manualActive !== 'boolean') {
    return res.status(400).json({ error: '`manualActive` must be a boolean' });
  }

  let query;
  if (req.user) {
    query = { userId: req.user._id };
  } else {
    const existing = await FeedingSchedule.findOne().sort({ updatedAt: -1 });
    query = existing ? { _id: existing._id } : { userId: 'anonymous' };
  }

  const schedule = await FeedingSchedule.findOneAndUpdate(
    query,
    { manualActive: req.body.manualActive },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  emitFeeding(req, schedule);
  res.json({ manualActive: schedule.manualActive });
});

module.exports = router;
