const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['temperature', 'clarity', 'ph', 'oxygen'],
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
    // Optional: which pond/device this came from
    deviceId: {
      type: String,
      default: 'pond-01',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // Don't use default createdAt/updatedAt — recordedAt is canonical
    timestamps: false,
  }
);

// TTL index: auto-delete readings older than 30 days to avoid runaway storage
sensorReadingSchema.index({ recordedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
