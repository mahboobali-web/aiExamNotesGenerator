import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

export interface AuthRequest extends Request {
  user?: any;
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
