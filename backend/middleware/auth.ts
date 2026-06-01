import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import User from '../models/User';
import Session from '../models/Session';

export interface AuthRequest extends Request {
  user?: any;
  session?: any;
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  if (!auth) {
    return res.status(500).json({ error: 'Firebase Auth not initialized on server' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
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
        
        const isSyncRoute = req.originalUrl?.endsWith('/sync') || req.path === '/sync';
        
        // Block request if session is revoked, or if session doesn't exist on a non-sync route
        if (session?.revokedAt || (!session && !isSyncRoute)) {
          return res.status(401).json({ error: 'Session revoked. Forced logout.' });
        }
        
        if (session) {
          // Update lastActive timestamp
          session.lastActive = new Date();
          await session.save();
          req.session = session;
        }
      }
    }

    next();
  } catch (error: any) {
    console.error('Token verification error:', error.message || error);
    
    // Developer fallback for audience/project mismatch during transition
    const isAudienceMismatch = 
      error.code === 'auth/argument-error' || 
      error.errorInfo?.code === 'auth/argument-error' ||
      error.message?.includes('aud') || 
      error.message?.includes('audience') ||
      error.message?.includes('expected');
      
    if (isAudienceMismatch && process.env.NODE_ENV !== 'production') {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
          const decodedToken = JSON.parse(jsonPayload);
          
          console.warn('⚠️ DEV WARNING: Bypassing signature/audience check due to project mismatch. Loaded user:', decodedToken.email);
          
          req.user = {
            uid: decodedToken.user_id || decodedToken.sub,
            email: decodedToken.email,
            name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
            ...decodedToken
          };

          // Validate session with fallback auth token
          const clientRefreshToken = req.headers['x-refresh-token'] as string;
          if (clientRefreshToken) {
            const dbUser = await User.findOne({ firebaseUid: req.user.uid });
            if (dbUser) {
              const session = await Session.findOne({
                userId: dbUser._id,
                refreshToken: clientRefreshToken
              });
              
              const isSyncRoute = req.originalUrl?.endsWith('/sync') || req.path === '/sync';
              
              if (session?.revokedAt || (!session && !isSyncRoute)) {
                return res.status(401).json({ error: 'Session revoked. Forced logout.' });
              }
              
              if (session) {
                session.lastActive = new Date();
                await session.save();
                req.session = session;
              }
            }
          }

          return next();
        } else {
          console.error('⚠️ DEV WARNING: Token is not a valid 3-part JWT, cannot bypass.');
        }
      } catch (innerError: any) {
        console.error('⚠️ DEV WARNING: Failed to parse JWT fallback:', innerError.message || innerError);
      }
    }
    
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
