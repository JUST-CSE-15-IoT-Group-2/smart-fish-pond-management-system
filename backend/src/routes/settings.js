const express = require('express');
const SystemSettings = require('../models/SystemSettings');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// GET /api/settings — get current user's system settings
router.get('/', async (req, res) => {
  let settings = await SystemSettings.findOne({ userId: req.user._id });
  if (!settings) {
    settings = await SystemSettings.create({ userId: req.user._id });
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

  const settings = await SystemSettings.findOneAndUpdate(
    { userId: req.user._id },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const { gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, smsAlerts, emailAlerts } = settings;
  res.json({ gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, smsAlerts, emailAlerts });
});

module.exports = router;
