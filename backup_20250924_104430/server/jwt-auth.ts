import jwt from 'jsonwebtoken';
import type { User } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class JWTAuthService {
  // Generate JWT token
  static generateToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Verify JWT token
  static verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  // Generate refresh token (longer expiry)
  static generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
  }

  // Verify refresh token
  static verifyRefreshToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      return decoded;
    } catch (error) {
      console.error('Refresh token verification error:', error);
      return null;
    }
  }
}

// Token blacklist for logout functionality
class TokenBlacklist {
  private static blacklistedTokens = new Set<string>();

  static addToBlacklist(token: string): void {
    this.blacklistedTokens.add(token);
  }

  static isBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  static removeFromBlacklist(token: string): void {
    this.blacklistedTokens.delete(token);
  }

  // Clean up expired tokens periodically (in production, use Redis or database)
  static cleanupExpiredTokens(): void {
    // This is a simple implementation - in production, you'd want to
    // decode tokens and check their expiry dates
    if (this.blacklistedTokens.size > 1000) {
      this.blacklistedTokens.clear();
    }
  }
}

export { TokenBlacklist };

