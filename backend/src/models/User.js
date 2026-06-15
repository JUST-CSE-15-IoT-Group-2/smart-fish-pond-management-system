const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    picture: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['admin', 'operator', 'viewer'],
      default: 'operator',
    },
    apiKey: {
      type: String,
      unique: true,
      default: () => `fpms_live_sk_${uuidv4().replace(/-/g, '')}`,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
