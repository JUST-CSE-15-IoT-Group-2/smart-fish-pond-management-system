const User = require('../models/User');

/**
 * API Key auth middleware for IoT device endpoints.
 * Reads the X-API-Key header and looks up the matching user.
 * Attaches req.user on success.
 */
const requireApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'X-API-Key header is required' });
  }

  const user = await User.findOne({ apiKey });
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.user = user;
  next();
};

module.exports = { requireApiKey };
