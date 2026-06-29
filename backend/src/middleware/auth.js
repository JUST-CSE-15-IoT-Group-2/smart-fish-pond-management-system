const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT from httpOnly cookie or Authorization: Bearer header.
 * Attaches req.user = full Mongoose user document.
 */
const requireAuth = async (req, res, next) => {
  let token;

  // 1. Check httpOnly cookie (set after OAuth)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 2. Fallback: Authorization: Bearer <token>
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-__v');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { requireAuth };
