const mongoose = require('mongoose');

const feedingScheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one schedule per user
    },
    // Array of time strings e.g. ["08:00 AM", "01:00 PM", "07:00 PM"]
    times: {
      type: [String],
      default: ['08:00 AM', '01:00 PM', '07:00 PM'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeedingSchedule', feedingScheduleSchema);
