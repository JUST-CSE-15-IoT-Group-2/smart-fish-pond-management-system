const mongoose = require('mongoose');

const motorStateSchema = new mongoose.Schema(
  {
    // Singleton key — one motor state per physical device
    deviceId: {
      type: String,
      required: true,
      unique: true,
      default: 'pond-motor-01',
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    connectionActive: {
      type: Boolean,
      default: true,
    },
    // Speed as a percentage: 0 = off, 100 = full speed
    speed: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    // Manual override: true when turned on manually from frontend (bypasses auto rain sensor shutoff)
    manualOverride: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MotorState', motorStateSchema);
