import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'videochat-super-secret-production-key-change-me';

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
      req.user = decoded;
    } catch {
      // Ignore token failure for optional auth
    }
  }

  next();
}

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
