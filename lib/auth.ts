import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'perblinkist-super-secret-jwt-key-2026';
export const AUTH_COOKIE_NAME = 'perblinkist_token';
export const TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface AuthUserPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
}

/**
 * Standard Security Questions
 */
export const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'In which city or town were you born?',
  'What was the make and model of your first car?',
  'What was your childhood nickname?',
  'What was the name of your elementary school?',
  'What is your favorite book of all time?',
] as const;

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
 * Normalize and hash security answer
 */
export async function hashSecurityAnswer(rawAnswer: string): Promise<string> {
  const normalized = rawAnswer.trim().toLowerCase();
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(normalized, salt);
}

/**
 * Verify security answer against stored hash
 */
export async function verifySecurityAnswer(rawAnswer: string, hash: string): Promise<boolean> {
  const normalized = rawAnswer.trim().toLowerCase();
  return bcrypt.compare(normalized, hash);
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
  return `${AUTH_COOKIE_NAME}=${token}; Path=/; Max-Age=${TOKEN_MAX_AGE}; HttpOnly; SameSite=Lax`;
}

/**
 * Clear auth cookie string
 */
export function createClearAuthCookie(): string {
  return `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

/**
 * Extract auth token from raw cookie header string
 */
export function getAuthTokenFromHeader(cookieHeader?: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
