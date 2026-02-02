import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-development-jwt-secret-key-minimum-32-chars-required-for-security';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export interface RefreshTokenPayload {
  id: string;
  tokenVersion?: number; // For token revocation
}

/**
 * Generate short-lived access token (15 minutes)
 * Stored in memory on frontend
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m', // Short-lived for security
    issuer: 'product-management',
    audience: 'api'
  });
};

/**
 * Generate long-lived refresh token (7 days)
 * Stored in httpOnly cookie
 */
export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: '7d', // Long-lived
    issuer: 'product-management',
    audience: 'refresh'
  });
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'product-management',
    audience: 'api'
  }) as TokenPayload;
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer: 'product-management',
    audience: 'refresh'
  }) as RefreshTokenPayload;
};

/**
 * Cookie options for refresh token
 */
export const refreshTokenCookieOptions = {
  httpOnly: true, // Prevents XSS attacks
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax' as const, // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth' // Only sent to auth endpoints
};

/**
 * Clear auth cookies
 */
export const clearAuthCookies = (res: any) => {
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.clearCookie('token'); // Legacy cookie for backward compatibility
};
