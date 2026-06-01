import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Session from '../models/Session';
import { verifyAccessToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: any;
  session?: any;
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decodedToken = verifyAccessToken(token);
    req.user = decodedToken;
    
    // Validate active session if X-Refresh-Token is provided
    const clientRefreshToken = req.headers['x-refresh-token'] as string;
    if (clientRefreshToken) {
      const dbUser = await User.findOne({ firebaseUid: decodedToken.uid });
      if (dbUser) {
        const session = await Session.findOne({
          userId: dbUser._id,
          refreshToken: clientRefreshToken
        });
        
        // Block request if session is revoked, or if session doesn't exist
        if (session?.revokedAt || !session) {
          return res.status(401).json({ error: 'Session revoked or invalid. Forced logout.' });
        }
        
        if (session) {
          // Update lastActive timestamp occasionally (every 5 mins maybe) but let's just do it here for now
          // to avoid too many DB writes, maybe we should throttle this? For now it's fine.
          session.lastActive = new Date();
          await session.save();
          req.session = session;
        }
      }
    }

    next();
  } catch (error: any) {
    console.error('Token verification error:', error.message || error);
    
    // Check if it's an expired token
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Token expired' });
    }
    
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
