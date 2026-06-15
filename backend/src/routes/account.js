const express = require('express');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// GET /api/account — return profile + api key
router.get('/', (req, res) => {
  const { _id, name, email, picture, role, apiKey, createdAt } = req.user;
  res.json({ _id, name, email, picture, role, apiKey, createdAt });
});

// POST /api/account/regenerate-key — generate a fresh API key
router.post('/regenerate-key', async (req, res) => {
  const newKey = `fpms_live_sk_${uuidv4().replace(/-/g, '')}`;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { apiKey: newKey },
    { new: true }
  );
  res.json({ apiKey: user.apiKey });
});

module.exports = router;
