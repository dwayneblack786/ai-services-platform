import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Content Security Policy configuration
 */
export const cspMiddleware = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for React hot reload in dev
      "'unsafe-eval'", // Required for dev tools
      'https://cdn.jsdelivr.net',
      'https://cdnjs.cloudflare.com',
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for styled components
      'https://fonts.googleapis.com',
    ],
    fontSrc: [
      "'self'",
      'https://fonts.gstatic.com',
      'data:',
    ],
    imgSrc: [
      "'self'",
      'data:',
      'https:',
      'blob:',
    ],
    connectSrc: [
      "'self'",
      'http://localhost:*', // Dev server
      'ws://localhost:*', // WebSocket for HMR
      'wss://localhost:*',
      process.env.KEYCLOAK_BASE_URL || '',
      'https://*.applicationinsights.azure.com',
      'https://*.sentry.io',
    ].filter(Boolean),
    frameSrc: [
      "'self'",
      process.env.KEYCLOAK_BASE_URL || '',
    ].filter(Boolean),
    objectSrc: ["'none'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
  },
});

/**
 * Additional security headers
 */
export const securityHeadersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );
  
  next();
};

/**
 * HSTS (HTTP Strict Transport Security)
 * Only enable in production with HTTPS
 */
export const hstsMiddleware = helmet.hsts({
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true,
});

/**
 * Combined security middleware
 */
export const applySecurityMiddleware = (app: any) => {
  // Basic helmet protection
  app.use(helmet());
  
  // CSP
  app.use(cspMiddleware);
  
  // Additional headers
  app.use(securityHeadersMiddleware);
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    app.use(hstsMiddleware);
  }
};
