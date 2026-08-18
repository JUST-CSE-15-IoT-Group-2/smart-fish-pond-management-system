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
    turbidityMax: { type: Number, default: 60 }, // Turbidity NTU threshold (triggers alarm if >=)
    rainThreshold: { type: Number, default: 40 }, // Rain % threshold (triggers oxygen pump if >=)
    autoOxygenOnRain: { type: Boolean, default: true }, // Auto-activate oxygen dissolving motor on rain
    // Notification preferences
    smsAlerts: { type: Boolean, default: true },
    emailAlerts: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
