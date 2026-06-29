const express = require('express');
const SystemSettings = require('../models/SystemSettings');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Optional auth — try to extract user but don't block if absent
const optionalAuth = async (req, res, next) => {
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

// GET /api/settings — get system settings
router.get('/', async (req, res) => {
  let settings;
  if (req.user) {
    settings = await SystemSettings.findOne({ userId: req.user._id });
    if (!settings) settings = await SystemSettings.create({ userId: req.user._id });
  } else {
    settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
  }
  if (!settings) {
    return res.json({ tempMin: 20, tempMax: 28, phMin: 6.5, phMax: 8.5, smsAlerts: false, emailAlerts: false });
  }
  const { gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, smsAlerts, emailAlerts } = settings;
  res.json({ gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, smsAlerts, emailAlerts });
});

// PUT /api/settings — save system settings
router.put('/', async (req, res) => {
  const allowed = ['gatewayIp', 'mqttPort', 'tempMin', 'tempMax', 'phMin', 'phMax', 'smsAlerts', 'emailAlerts'];
  const update = {};

  allowed.forEach((key) => {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  });

  let query;
  if (req.user) {
    query = { userId: req.user._id };
  } else {
    const existing = await SystemSettings.findOne().sort({ updatedAt: -1 });
    query = existing ? { _id: existing._id } : { userId: 'anonymous' };
  }

  const settings = await SystemSettings.findOneAndUpdate(
    query,
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const { gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, smsAlerts, emailAlerts } = settings;
  res.json({ gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, smsAlerts, emailAlerts });
});

module.exports = router;
