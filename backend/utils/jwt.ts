import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Use a secure secret from environment variables, fallback to a default for development
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production';

export interface JwtPayload {
  uid: string;
  email: string;
  name: string;
}

export const generateAccessToken = (payload: JwtPayload): string => {
  // Access token expires in 15 minutes as requested
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (): string => {
  // Generate a secure random string for the refresh token
  return crypto.randomBytes(40).toString('hex');
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
