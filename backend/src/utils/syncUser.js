const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Synchronizes the admin User ID & Password from environment variables into MongoDB.
 * Runs at backend startup.
 */
async function syncEnvUser() {
  try {
    const rawUserId = process.env.AUTH_USER_ID || process.env.ADMIN_USER_ID || process.env.AUTH_USERNAME || process.env.ADMIN_USERNAME || 'admin';
    const rawPassword = process.env.AUTH_PASSWORD || process.env.ADMIN_PASSWORD || 'admin123';
    const userName = process.env.AUTH_USER_NAME || 'Admin User';

    const userId = rawUserId.trim();
    const password = String(rawPassword);

    let user = await User.findOne({
      $or: [
        { userId: userId },
        { email: userId.toLowerCase() },
      ],
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({
        userId,
        password: hashedPassword,
        name: userName,
        email: userId.includes('@') ? userId.toLowerCase() : `${userId.toLowerCase()}@smartpond.local`,
        role: 'admin',
      });
      console.log(`[FPMS Auth] Created new admin user "${userId}" in database.`);
    } else {
      // User exists — check if password or fields need updating
      let modified = false;

      // Update userId field if not set
      if (!user.userId) {
        user.userId = userId;
        modified = true;
      }

      // Check if password changed
      const passwordMatch = user.password ? await bcrypt.compare(password, user.password) : false;
      if (!passwordMatch) {
        user.password = await bcrypt.hash(password, 10);
        modified = true;
        console.log(`[FPMS Auth] Updated password for user "${userId}" in database.`);
      }

      if (user.role !== 'admin') {
        user.role = 'admin';
        modified = true;
      }

      if (modified) {
        await user.save();
      }
      console.log(`[FPMS Auth] Admin user "${userId}" is ready in database.`);
    }
  } catch (err) {
    console.error('[FPMS Auth] Failed to sync admin user from environment:', err.message);
  }
}

module.exports = { syncEnvUser };
