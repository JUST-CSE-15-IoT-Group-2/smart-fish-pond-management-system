const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    password: {
      type: String, // bcrypt hashed password
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      default: 'Admin User',
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    picture: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['admin', 'operator', 'viewer'],
      default: 'admin',
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
