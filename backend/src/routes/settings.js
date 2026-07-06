const express = require('express');
const SystemSettings = require('../models/SystemSettings');
const { checkWeatherAndControlMotor } = require('../services/weatherService');
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
    return res.json({ tempMin: 20, tempMax: 28, phMin: 6.5, phMax: 8.5, oxygenMin: 5.0, rainMax: 60.0, latitude: 52.52, longitude: 13.41, smsAlerts: false, emailAlerts: false });
  }
  const { gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, oxygenMin, rainMax, latitude, longitude, smsAlerts, emailAlerts, weatherTemp, weatherHumidity, weatherWindSpeed, weatherRain, weatherCode, weatherStatus, weatherTime, weatherElevation } = settings;
  res.json({ gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, oxygenMin, rainMax, latitude, longitude, smsAlerts, emailAlerts, weatherTemp, weatherHumidity, weatherWindSpeed, weatherRain, weatherCode, weatherStatus, weatherTime, weatherElevation });
});

// PUT /api/settings — save system settings
router.put('/', async (req, res) => {
  const allowed = ['gatewayIp', 'mqttPort', 'tempMin', 'tempMax', 'phMin', 'phMax', 'oxygenMin', 'rainMax', 'latitude', 'longitude', 'smsAlerts', 'emailAlerts'];
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

  let settings = await SystemSettings.findOneAndUpdate(
    query,
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Trigger weather scan immediately if location has changed
  if (update.latitude !== undefined || update.longitude !== undefined) {
    const io = req.app.get('io');
    try {
      await checkWeatherAndControlMotor(io);
      settings = await SystemSettings.findById(settings._id);
    } catch (err) {
      console.error('[Settings API] Failed to run immediate weather check:', err.message);
    }
  }

  const { gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, oxygenMin, rainMax, latitude, longitude, smsAlerts, emailAlerts, weatherTemp, weatherHumidity, weatherWindSpeed, weatherRain, weatherCode, weatherStatus, weatherTime, weatherElevation } = settings;
  res.json({ gatewayIp, mqttPort, tempMin, tempMax, phMin, phMax, oxygenMin, rainMax, latitude, longitude, smsAlerts, emailAlerts, weatherTemp, weatherHumidity, weatherWindSpeed, weatherRain, weatherCode, weatherStatus, weatherTime, weatherElevation });
});

module.exports = router;
