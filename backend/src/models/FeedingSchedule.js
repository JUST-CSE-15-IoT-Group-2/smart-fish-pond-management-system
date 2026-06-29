const mongoose = require('mongoose');

const feedingScheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Scheduled feeding times e.g. ["08:00 AM", "01:00 PM"]
    times: {
      type: [String],
      default: ['08:00 AM', '01:00 PM', '07:00 PM'],
    },
    // How many minutes the feeder runs at each scheduled time
    durationMinutes: {
      type: Number,
      default: 1,
      min: 1,
      max: 60,
    },
    // When true, scheduled feeding is suspended and the user controls the
    // feeder motor directly from the frontend (manualActive flag)
    manualMode: {
      type: Boolean,
      default: false,
    },
    // Only meaningful when manualMode is true — mirrors the physical relay state
    manualActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeedingSchedule', feedingScheduleSchema);
