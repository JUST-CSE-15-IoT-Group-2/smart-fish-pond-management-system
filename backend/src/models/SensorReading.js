const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['temperature', 'turbidity', 'ph', 'rain', 'oxygen'],
      required: true,
      index: true,
    },
    value: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      default: '',
    },
    deviceId: {
      type: String,
      default: 'pond-01',
    },
    // recordedAt: no inline "index: true" here — the TTL index below covers it
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// TTL index: auto-delete readings older than 30 days
// Only one index definition on recordedAt — removes the duplicate warning
sensorReadingSchema.index({ recordedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
