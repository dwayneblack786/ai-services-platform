/**
 * Environment Variable Validation and Type-Safe Access
 * 
 * This module validates all required environment variables at startup
 * and provides type-safe access throughout the application.
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment variable validation error
 */
class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * Get required environment variable or throw error
 */
function getRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new EnvValidationError(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
function getOptional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Get number environment variable
 */
function getNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new EnvValidationError(`Environment variable ${key} must be a valid number, got: ${value}`);
  }
  return parsed;
}

/**
 * Get boolean environment variable
 */
function getBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  
  const lower = value.toLowerCase();
  if (lower === 'true' || lower === '1') {
    return true;
  }
  if (lower === 'false' || lower === '0') {
    return false;
  }
  
  throw new EnvValidationError(`Environment variable ${key} must be 'true' or 'false', got: ${value}`);
}

/**
 * Validate URL format
 */
function validateUrl(url: string, key: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    throw new EnvValidationError(`Environment variable ${key} must be a valid URL, got: ${url}`);
  }
}

/**
 * Validated and typed environment configuration
 */
export const env = {
  // Node environment
  NODE_ENV: getOptional('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  PORT: getNumber('PORT', 3001),
  
  // Database
  MONGODB_URI: getRequired('MONGODB_URI'),
  
  // Redis
  REDIS_URL: getOptional('REDIS_URL', 'redis://localhost:6379'),
  
  // Authentication
  SESSION_SECRET: getRequired('SESSION_SECRET'),
  
  // Keycloak
  KEYCLOAK_URL: getOptional('KEYCLOAK_URL', 'http://localhost:9999'),
  KEYCLOAK_DEFAULT_REALM: getOptional('KEYCLOAK_DEFAULT_REALM', 'tenant-default'),
  
  // Frontend URL
  FRONTEND_URL: getOptional('FRONTEND_URL', 'http://localhost:5173'),
  
  // CORS Origins (comma-separated)
  CORS_ORIGINS: getOptional('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map(origin => origin.trim()),
  
  // Logging
  LOG_LEVEL: getOptional('LOG_LEVEL', 'info') as 'error' | 'warn' | 'info' | 'http' | 'debug',
  
  // Rate Limiting
  RATE_LIMIT_ENABLED: getBoolean('RATE_LIMIT_ENABLED', true),
  RATE_LIMIT_CONCURRENT_STREAMS: getNumber('RATE_LIMIT_CONCURRENT_STREAMS', 5),
  RATE_LIMIT_MESSAGES_PER_HOUR: getNumber('RATE_LIMIT_MESSAGES_PER_HOUR', 100),
  RATE_LIMIT_MESSAGES_PER_DAY: getNumber('RATE_LIMIT_MESSAGES_PER_DAY', 1000),
  RATE_LIMIT_TOKENS_PER_DAY: getNumber('RATE_LIMIT_TOKENS_PER_DAY', 50000),
  
  // gRPC Services
  GRPC_VA_SERVICE_URL: getOptional('GRPC_VA_SERVICE_URL', 'localhost:50051'),
  GRPC_CV_SERVICE_URL: getOptional('GRPC_CV_SERVICE_URL', 'localhost:50052'),
  GRPC_IDP_SERVICE_URL: getOptional('GRPC_IDP_SERVICE_URL', 'localhost:50053'),
  
  // REST API Services
  VA_SERVICE_REST_URL: getOptional('VA_SERVICE_REST_URL', 'http://localhost:8136'),
  
  // Session Configuration
  SESSION_COOKIE_MAX_AGE: getNumber('SESSION_COOKIE_MAX_AGE', 24 * 60 * 60 * 1000), // 24 hours
  SESSION_COOKIE_SECURE: getBoolean('SESSION_COOKIE_SECURE', false), // true in production
  
  // API Timeouts
  API_TIMEOUT: getNumber('API_TIMEOUT', 10000), // 10 seconds
  
  // Circuit Breaker
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: getNumber('CIRCUIT_BREAKER_FAILURE_THRESHOLD', 5),
  CIRCUIT_BREAKER_SUCCESS_THRESHOLD: getNumber('CIRCUIT_BREAKER_SUCCESS_THRESHOLD', 2),
  CIRCUIT_BREAKER_TIMEOUT: getNumber('CIRCUIT_BREAKER_TIMEOUT', 60000), // 1 minute
  
  // Feature Flags
  ENABLE_SWAGGER: getBoolean('ENABLE_SWAGGER', true),
  ENABLE_METRICS: getBoolean('ENABLE_METRICS', false),
} as const;

/**
 * Validate all required environment variables
 * Call this at application startup
 */
export function validateEnv(): void {
  const errors: string[] = [];
  
  try {
    // Validate MongoDB URI format
    if (!env.MONGODB_URI.startsWith('mongodb://') && !env.MONGODB_URI.startsWith('mongodb+srv://')) {
      errors.push('MONGODB_URI must start with mongodb:// or mongodb+srv://');
    }
    
    // Validate Redis URL format (if provided)
    if (process.env.REDIS_URL) {
      validateUrl(env.REDIS_URL, 'REDIS_URL');
    }
    
    // Validate frontend URL
    validateUrl(env.FRONTEND_URL, 'FRONTEND_URL');
    
    // Validate Keycloak URL
    validateUrl(env.KEYCLOAK_URL, 'KEYCLOAK_URL');
    
    // Validate session secret length
    if (env.SESSION_SECRET.length < 32) {
      errors.push('SESSION_SECRET must be at least 32 characters long for security');
    }
    
    // Validate NODE_ENV
    if (!['development', 'production', 'test'].includes(env.NODE_ENV)) {
      errors.push(`NODE_ENV must be 'development', 'production', or 'test', got: ${env.NODE_ENV}`);
    }
    
    // Validate log level
    if (!['error', 'warn', 'info', 'http', 'debug'].includes(env.LOG_LEVEL)) {
      errors.push(`LOG_LEVEL must be one of: error, warn, info, http, debug. Got: ${env.LOG_LEVEL}`);
    }
    
    // Warn if using insecure cookies in production
    if (env.NODE_ENV === 'production' && !env.SESSION_COOKIE_SECURE) {
      console.warn('⚠️  WARNING: SESSION_COOKIE_SECURE is false in production. This is insecure!');
    }
    
  } catch (error) {
    if (error instanceof EnvValidationError) {
      errors.push(error.message);
    } else {
      throw error;
    }
  }
  
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:\n');
    errors.forEach(error => console.error(`   - ${error}`));
    console.error('\nPlease check your .env file and ensure all required variables are set correctly.\n');
    process.exit(1);
  }
  
  console.log('✅ Environment validation passed');
  console.log(`   - Environment: ${env.NODE_ENV}`);
  console.log(`   - Port: ${env.PORT}`);
  console.log(`   - Database: ${env.MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')}`); // Hide credentials
  console.log(`   - Redis: ${env.REDIS_URL}`);
  console.log(`   - Frontend: ${env.FRONTEND_URL}`);
  console.log(`   - Rate Limiting: ${env.RATE_LIMIT_ENABLED ? 'Enabled' : 'Disabled'}`);
}

// Export type for use in other modules
export type Environment = typeof env;
