const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Configure Passport Google Strategy (Optional) ───────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await User.findOneAndUpdate(
            { googleId: profile.id },
            {
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails?.[0]?.value || '',
              picture: profile.photos?.[0]?.value || '',
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

// ─── Routes ────────────────────────────────────────────────────────────────

// POST /api/auth/login — authenticate with User ID & Password
router.post('/login', async (req, res) => {
  const { userId, username, password } = req.body;
  const loginIdentifier = (userId || username || '').trim();

  if (!loginIdentifier || !password) {
    return res.status(400).json({ error: 'User ID and password are required' });
  }

  // Match by userId or email (case-insensitive for email)
  const user = await User.findOne({
    $or: [
      { userId: loginIdentifier },
      { email: loginIdentifier.toLowerCase() },
    ],
  });

  if (!user || !user.password) {
    return res.status(401).json({ error: 'Invalid User ID or password' });
  }

  const isMatch = await bcrypt.compare(String(password), user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid User ID or password' });
  }

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    message: 'Login successful',
    user: {
      _id: user._id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      picture: user.picture,
      apiKey: user.apiKey,
    },
  });
});

// GET /api/auth/google — kick off OAuth flow
router.get(
  '/google',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?auth=not_configured`);
    }
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
  }
);

// GET /api/auth/google/callback — Google redirects here after consent
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?auth=failed` }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`);
  }
);

// POST /api/auth/logout — clear the cookie
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me — return current user (protected)
router.get('/me', requireAuth, (req, res) => {
  const { _id, userId, name, email, picture, role, apiKey, createdAt } = req.user;
  res.json({ _id, userId: userId || name, name, email, picture, role, apiKey, createdAt });
});

module.exports = router;
