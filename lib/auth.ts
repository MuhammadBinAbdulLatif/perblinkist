import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'perblinkist-super-secret-jwt-key-2026';
const AUTH_COOKIE_NAME = 'perblinkist_token';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface AuthUserPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
}

/**
 * Hash password securely with bcrypt
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

/**
 * Compare plain password against bcrypt hash
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Generate signed JWT token
 */
export function signAuthToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * Verify and decode JWT token
 */
export function verifyAuthToken(token: string): AuthUserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUserPayload;
  } catch {
    return null;
  }
}

/**
 * Create auth cookie string
 */
export function createAuthCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `${AUTH_COOKIE_NAME}=${token}; Path=/; Max-Age=${TOKEN_MAX_AGE}; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
}

/**
 * Clear auth cookie string
 */
export function createClearAuthCookie(): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
}

/**
 * Extract auth token from raw cookie header string
 */
export function getAuthTokenFromHeader(cookieHeader?: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
