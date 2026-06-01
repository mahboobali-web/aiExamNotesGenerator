import express, { Request, Response } from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { auth } from '../config/firebase';
import User from '../models/User';
import Session from '../models/Session';
import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

const router = express.Router();

const updateUserStreak = async (user: any) => {
  const now = new Date();
  const lastActive = user.lastActiveDate;
  
  if (!lastActive) {
    user.currentStreak = 1;
    user.lastActiveDate = now;
  } else {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
    
    const diffTime = today.getTime() - lastActiveDay.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      user.currentStreak += 1;
      user.lastActiveDate = now;
    } else if (diffDays > 1) {
      user.currentStreak = 1;
      user.lastActiveDate = now;
    } else {
      user.lastActiveDate = now;
    }
  }
  await user.save();
  return user;
};

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // Verify Firebase ID Token
    if (!auth) {
      return res.status(500).json({ error: 'Firebase Auth not initialized on server' });
    }
    const decodedToken = await auth.verifyIdToken(token);
    const { uid, email, name } = decodedToken;

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
          console.error(`SECURITY WARNING: Blocked attempt to overwrite firebaseUid for existing verified user: ${email}`);
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

    // Generate Custom Tokens
    const accessToken = generateAccessToken({
      uid: user.firebaseUid,
      email: user.email,
      name: user.displayName || 'User'
    });
    
    const refreshToken = generateRefreshToken();

    // Register active session in MongoDB
    const userAgent = req.headers['user-agent'] || '';
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';

    // Update the streak when they log in
    user = await updateUserStreak(user);
    if (!user) {
      return res.status(500).json({ error: 'Failed to update user profile during login.' });
    }
    
    // Parse User Agent
    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();
    
    const browserName = uaResult.browser.name || 'Unknown Browser';
    const browserVersion = uaResult.browser.version ? ` ${uaResult.browser.version}` : '';
    const osName = uaResult.os.name || 'Unknown OS';
    const osVersion = uaResult.os.version ? ` ${uaResult.os.version}` : '';
    
    let deviceName = 'Desktop';
    if (uaResult.device.model) {
      deviceName = uaResult.device.model;
    } else if (uaResult.device.type === 'mobile') {
      deviceName = 'Mobile Device';
    } else if (uaResult.device.type === 'tablet') {
      deviceName = 'Tablet Device';
    } else if (osName.toLowerCase().includes('mac')) {
      deviceName = 'MacBook / Mac';
    } else if (osName.toLowerCase().includes('windows')) {
      deviceName = 'Windows PC';
    }

    // Geo-locate IP
    let locationString = 'Localhost / Unknown Location';
    const cleanIp = ip.includes('::ffff:') ? ip.split('::ffff:')[1] : ip;
    if (cleanIp && cleanIp !== '127.0.0.1' && cleanIp !== '::1') {
      try {
        const geo = geoip.lookup(cleanIp);
        if (geo) {
          const city = geo.city || '';
          const region = geo.region || '';
          const country = geo.country || '';
          locationString = [city, region, country].filter(Boolean).join(', ');
        }
      } catch (geoErr) {
        console.warn('Geolocation lookup failed:', geoErr);
      }
    }

    const session = new Session({
      userId: user._id,
      refreshToken,
      device: deviceName,
      browser: `${browserName}${browserVersion}`.trim(),
      os: `${osName}${osVersion}`.trim(),
      ipAddress: cleanIp,
      location: locationString,
      lastActive: new Date()
    });
    await session.save();
    console.log(`Created new device session for user: ${email} on ${deviceName}`);

    res.json({ user, accessToken, refreshToken });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh Token Endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    const session = await Session.findOne({ refreshToken });
    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (session.revokedAt) {
      return res.status(401).json({ error: 'Session revoked. Forced logout.' });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new Access Token
    const accessToken = generateAccessToken({
      uid: user.firebaseUid,
      email: user.email,
      name: user.displayName || 'User'
    });

    // Update session last active
    session.lastActive = new Date();
    await session.save();

    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout Endpoint
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      // Mark session as revoked or delete it. Let's delete it for cleanliness, or just set revokedAt
      const session = await Session.findOne({ refreshToken });
      if (session) {
        session.revokedAt = new Date();
        await session.save();
      }
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Current User
router.get('/me', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    let user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update streak on fetch to ensure it's up to date
    user = await updateUserStreak(user);
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Current User Profile
router.put('/me', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { displayName } = req.body;
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (displayName !== undefined) {
      user.displayName = displayName;
    }
    
    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
