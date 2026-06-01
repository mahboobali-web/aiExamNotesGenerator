import express from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Session from '../models/Session';

const router = express.Router();

// GET /api/sessions - Retrieve all active device sessions
router.get('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const clientRefreshToken = req.headers['x-refresh-token'] as string;

    // Fetch active sessions (not revoked)
    const sessions = await Session.find({
      userId: user._id,
      revokedAt: { $exists: false }
    }).sort({ lastActive: -1 });

    // Map to include dynamic isCurrent badge
    const formattedSessions = sessions.map((s) => {
      const isCurrent = clientRefreshToken ? s.refreshToken === clientRefreshToken : false;
      return {
        _id: s._id,
        device: s.device,
        browser: s.browser,
        os: s.os,
        ipAddress: s.ipAddress,
        location: s.location,
        lastActive: s.lastActive,
        createdAt: s.createdAt,
        isCurrent
      };
    });

    // Sort current session to the top of the list
    formattedSessions.sort((a, b) => (a.isCurrent ? -1 : b.isCurrent ? 1 : 0));

    res.json({
      success: true,
      sessions: formattedSessions
    });
  } catch (err: any) {
    console.error('[SESSIONS] GET failed:', err);
    res.status(500).json({ error: 'Failed to retrieve active sessions.' });
  }
});

// DELETE /api/sessions/:id - Revoke specific device session
router.delete('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const session = await Session.findOne({
      _id: req.params.id,
      userId: user._id
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    // Mark session as revoked
    session.revokedAt = new Date();
    await session.save();

    console.log(`[SESSIONS] Revoked session: ${session._id} for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Session successfully revoked.'
    });
  } catch (err: any) {
    console.error('[SESSIONS] DELETE failed:', err);
    res.status(500).json({ error: 'Failed to revoke session.' });
  }
});

// POST /api/sessions/revoke-all - Revoke all other device sessions
router.post('/revoke-all', verifyToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const clientRefreshToken = req.headers['x-refresh-token'] as string;
    if (!clientRefreshToken) {
      return res.status(400).json({ error: 'Current session identifier is required.' });
    }

    // Mark all sessions except current as revoked
    const result = await Session.updateMany(
      {
        userId: user._id,
        refreshToken: { $ne: clientRefreshToken },
        revokedAt: { $exists: false }
      },
      {
        $set: { revokedAt: new Date() }
      }
    );

    console.log(`[SESSIONS] Revoked ${result.modifiedCount} other sessions for user: ${user.email}`);

    res.json({
      success: true,
      message: `Successfully revoked ${result.modifiedCount} other session(s).`
    });
  } catch (err: any) {
    console.error('[SESSIONS] REVOKE-ALL failed:', err);
    res.status(500).json({ error: 'Failed to revoke other sessions.' });
  }
});

export default router;
