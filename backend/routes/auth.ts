import express from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Session from '../models/Session';
import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';

const router = express.Router();

router.post('/sync', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { uid, email, name } = req.user;
    const { refreshToken } = req.body;

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
          console.error(`dYs" SECURITY WARNING: Blocked attempt to overwrite firebaseUid for existing verified user: ${email}`);
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

    // Register or update active session in MongoDB
    if (refreshToken) {
      const userAgent = req.headers['user-agent'] || '';
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
      
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

      // Find or create active session
      let session = await Session.findOne({ userId: user._id, refreshToken });
      if (session) {
        if (session.revokedAt) {
          // Reactivate or clear revocation if same refresh token is synced successfully
          session.revokedAt = undefined;
        }
        session.lastActive = new Date();
        session.ipAddress = cleanIp;
        session.location = locationString;
        await session.save();
      } else {
        session = new Session({
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
      }
    }

    res.json({ user });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
