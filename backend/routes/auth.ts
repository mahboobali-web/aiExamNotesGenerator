import express from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

router.post('/sync', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { uid, email, name } = req.user;

    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // Handle cases where user exists by email but has a different or missing firebaseUid
      user = await User.findOne({ email: email });
      if (user) {
        const isUidEmpty = !user.firebaseUid || user.firebaseUid.trim() === '';
        const isDevelopment = process.env.NODE_ENV !== 'production';

        if (isUidEmpty || isDevelopment) {
          user.firebaseUid = uid;
          if (name && !user.displayName) {
            user.displayName = name;
          }
          await user.save();
          console.log(`Updated firebaseUid for existing email record: ${email}`);
        } else {
          // Block UID overwrites in production to prevent account hijacking
          console.error(`🚨 SECURITY WARNING: Blocked attempt to overwrite firebaseUid for existing verified user: ${email}`);
          return res.status(409).json({ error: 'Conflict: Email is already associated with another account.' });
        }
      } else {
        user = new User({
          firebaseUid: uid,
          email: email,
          displayName: name || email?.split('@')[0] || 'User',
          freeCredits: 100,
        });
        await user.save();
        console.log(`Created new user record for: ${email}`);
      }
    }

    res.json({ user });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
