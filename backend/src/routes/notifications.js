const express = require('express');
const PushSubscription = require('../models/PushSubscription');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications/vapid-public-key — Public endpoint for frontend to read VAPID key
router.get('/vapid-public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: 'VAPID public key not configured' });
  }
  res.json({ publicKey });
});

// POST /api/notifications/subscribe — Authenticated endpoint to store user's push subscription
router.post('/subscribe', requireAuth, async (req, res) => {
  const { subscription } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  // Create or update subscription
  const updated = await PushSubscription.findOneAndUpdate(
    {
      userId: req.user._id,
      'subscription.endpoint': subscription.endpoint,
    },
    {
      userId: req.user._id,
      subscription,
    },
    { upsert: true, new: true }
  );

  res.status(201).json({ success: true, id: updated._id });
});

module.exports = router;
