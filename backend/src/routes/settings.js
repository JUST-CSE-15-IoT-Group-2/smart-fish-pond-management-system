const express = require('express');
const SystemSettings = require('../models/SystemSettings');
const router = express.Router();

const ANONYMOUS_USER_ID = '000000000000000000000000';

const { optionalAuth } = require('../middleware/auth');

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
    return res.json({ tempMin: 20, tempMax: 28, phMin: 6.5, phMax: 8.5, oxygenMin: 5.0, rainMax: 60.0, smsAlerts: false, emailAlerts: false });
  }
  const { gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, oxygenMin, rainMax, smsAlerts, emailAlerts } = settings;
  res.json({ gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, oxygenMin, rainMax, smsAlerts, emailAlerts });
});

// PUT /api/settings — save system settings
router.put('/', async (req, res) => {
  const allowed = ['gatewayIp', 'mqttPort', 'tempMin', 'tempMax', 'phMin', 'phMax', 'oxygenMin', 'rainMax', 'smsAlerts', 'emailAlerts'];
  const update = {};

  allowed.forEach((key) => {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  });

  let query;
  if (req.user) {
    query = { userId: req.user._id };
  } else {
    const existing = await SystemSettings.findOne().sort({ updatedAt: -1 });
    query = existing ? { _id: existing._id } : { userId: ANONYMOUS_USER_ID };
  }

  const settings = await SystemSettings.findOneAndUpdate(
    query,
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const { gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, oxygenMin, rainMax, smsAlerts, emailAlerts } = settings;
  res.json({ gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, oxygenMin, rainMax, smsAlerts, emailAlerts });
});

module.exports = router;
