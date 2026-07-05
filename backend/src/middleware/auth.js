const User = require('../models/User');

/**
 * Helper to retrieve or create the default System Operator user.
 */
const getOrCreateDefaultUser = async () => {
  let user = await User.findOne({ email: 'operator@smartpond.local' });
  if (!user) {
    user = await User.create({
      googleId: 'system-operator-id',
      name: 'System Operator',
      email: 'operator@smartpond.local',
      picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Operator',
      role: 'admin',
      apiKey: 'fpms_live_sk_operator_key_default_12345'
    });
  }
  return user;
};

/**
 * Automatically attaches req.user = default System Operator user.
 */
const requireAuth = async (req, res, next) => {
  try {
    req.user = await getOrCreateDefaultUser();
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optional auth: Also automatically attaches req.user = default System Operator user.
 */
const optionalAuth = async (req, res, next) => {
  try {
    req.user = await getOrCreateDefaultUser();
  } catch (_) {
    // Ignore error, call next
  }
  next();
};

module.exports = { requireAuth, optionalAuth };
