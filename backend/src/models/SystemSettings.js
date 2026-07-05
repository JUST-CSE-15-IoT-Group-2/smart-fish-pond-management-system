const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    gatewayIp: {
      type: String,
      default: '192.168.1.45',
    },
    mqttPort: {
      type: Number,
      default: 1883,
    },
    // Sensor alarm thresholds
    tempMin: { type: Number, default: 20 },
    tempMax: { type: Number, default: 28 },
    phMin: { type: Number, default: 6.5 },
    phMax: { type: Number, default: 8.5 },
    oxygenMin: { type: Number, default: 5.0 },
    rainMax: { type: Number, default: 60.0 },
    // Notification preferences
    smsAlerts: { type: Boolean, default: true },
    emailAlerts: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
