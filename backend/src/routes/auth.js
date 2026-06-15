const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Configure Passport Google Strategy ────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // Upsert user — create on first login, update picture on subsequent
        const user = await User.findOneAndUpdate(
          { googleId: profile.id },
          {
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            picture: profile.photos[0]?.value || '',
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

// ─── Routes ────────────────────────────────────────────────────────────────

// GET /api/auth/google — kick off OAuth flow
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// GET /api/auth/google/callback — Google redirects here after consent
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/?auth=failed` }),
  (req, res) => {
    // Sign a JWT
    const token = jwt.sign(
      { userId: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Set httpOnly cookie so Next.js client can't read it via JS (XSS safe)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    // Redirect to dashboard
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  }
);

// POST /api/auth/logout — clear the cookie
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me — return current user (protected)
router.get('/me', requireAuth, (req, res) => {
  const { _id, name, email, picture, role, apiKey, createdAt } = req.user;
  res.json({ _id, name, email, picture, role, apiKey, createdAt });
});

module.exports = router;
