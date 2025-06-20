import jwt from 'jsonwebtoken';
import { User } from '@/lib/db/schema';
import { getJwtSecret, getJwtExpireTime } from '@/lib/config';

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = getJwtExpireTime();

export interface JWTPayload {
  id: string;
  email: string;
  username: string;
  role: string;
}

export function generateToken(user: Partial<User>): string {
  const payload: JWTPayload = {
    id: user.id!,
    email: user.email!,
    username: user.username!,
    role: user.role!,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  // 支持 "Bearer token" 格式
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  
  // 直接返回 token
  return authHeader;
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: '30d',
  });
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type === 'refresh' && decoded.userId) {
      return { userId: decoded.userId };
    }
    return null;
  } catch {
    return null;
  }
} 