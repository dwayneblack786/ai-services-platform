# Environment Configuration

This project uses a comprehensive environment variable validation system to ensure all required configuration is present and properly typed before the application starts.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the values in `.env` with your actual configuration

3. Start the application - it will automatically validate all environment variables

## Features

- ✅ **Validation on Startup** - Application fails fast if required variables are missing
- ✅ **Type Safety** - All environment variables are properly typed
- ✅ **Default Values** - Sensible defaults for optional configuration
- ✅ **Format Validation** - URLs, secrets, and other formats are validated
- ✅ **Security Checks** - Warns about insecure settings in production

## Required Variables

These environment variables **must** be set:

### Database & Cache
- `MONGODB_URI` - MongoDB connection string (must start with `mongodb://` or `mongodb+srv://`)
- `REDIS_URL` (optional) - Redis connection URL (defaults to `redis://localhost:6379`)

### Authentication
- `SESSION_SECRET` - Secret for session encryption (minimum 32 characters)
- `JWT_SECRET` - Secret for JWT token signing (minimum 32 characters)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

## Optional Variables

These have sensible defaults but can be customized:

### Server Configuration
- `NODE_ENV` - Environment mode (`development`, `production`, `test`) - default: `development`
- `PORT` - Server port - default: `3001`

### Frontend & CORS
- `FRONTEND_URL` - Frontend application URL - default: `http://localhost:5173`
- `CORS_ORIGINS` - Comma-separated list of allowed origins - default: `http://localhost:5173,http://localhost:3000`
- `GOOGLE_CALLBACK_URL` - OAuth callback URL - default: `http://localhost:3001/api/auth/google/callback`

### Logging
- `LOG_LEVEL` - Log level (`error`, `warn`, `info`, `http`, `debug`) - default: `info`

### Rate Limiting
- `RATE_LIMIT_ENABLED` - Enable/disable rate limiting - default: `true`
- `RATE_LIMIT_CONCURRENT_STREAMS` - Max concurrent streams per user - default: `5`
- `RATE_LIMIT_MESSAGES_PER_HOUR` - Max messages per hour per user - default: `100`
- `RATE_LIMIT_MESSAGES_PER_DAY` - Max messages per day per user - default: `1000`
- `RATE_LIMIT_TOKENS_PER_DAY` - Max tokens per day per user - default: `50000`

### gRPC Services
- `GRPC_VA_SERVICE_URL` - Voice Assistant service URL - default: `localhost:50051`
- `GRPC_CV_SERVICE_URL` - Computer Vision service URL - default: `localhost:50052`
- `GRPC_IDP_SERVICE_URL` - Identity Provider service URL - default: `localhost:50053`

### Session Configuration
- `SESSION_COOKIE_MAX_AGE` - Session cookie lifetime in milliseconds - default: `86400000` (24 hours)
- `SESSION_COOKIE_SECURE` - Use secure cookies (HTTPS only) - default: `false`

### API Configuration
- `API_TIMEOUT` - Default API timeout in milliseconds - default: `10000` (10 seconds)

### Circuit Breaker
- `CIRCUIT_BREAKER_FAILURE_THRESHOLD` - Failures before opening circuit - default: `5`
- `CIRCUIT_BREAKER_SUCCESS_THRESHOLD` - Successes before closing circuit - default: `2`
- `CIRCUIT_BREAKER_TIMEOUT` - Circuit breaker timeout in milliseconds - default: `60000` (1 minute)

### Feature Flags
- `ENABLE_SWAGGER` - Enable Swagger API documentation - default: `true`
- `ENABLE_METRICS` - Enable metrics collection - default: `false`

## Usage in Code

Import the validated environment configuration:

```typescript
import { env } from './config/env';

// Type-safe access to environment variables
console.log(env.PORT);              // number
console.log(env.NODE_ENV);          // 'development' | 'production' | 'test'
console.log(env.RATE_LIMIT_ENABLED); // boolean
console.log(env.CORS_ORIGINS);      // string[]
```

## Validation Behavior

On startup, the application will:

1. ✅ Load environment variables from `.env` file
2. ✅ Validate all required variables are present
3. ✅ Check format constraints (URLs, minimum lengths, etc.)
4. ✅ Warn about insecure settings in production
5. ❌ Exit with error message if validation fails

### Example Validation Output

**Success:**
```
✅ Environment validation passed
   - Environment: development
   - Port: 3001
   - Database: mongodb://***:***@localhost:27017/ai_platform
   - Redis: redis://localhost:6379
   - Frontend: http://localhost:5173
   - Rate Limiting: Enabled
```

**Failure:**
```
❌ Environment validation failed:

   - Missing required environment variable: MONGODB_URI
   - SESSION_SECRET must be at least 32 characters long for security
   - Environment variable GOOGLE_CALLBACK_URL must be a valid URL, got: invalid-url

Please check your .env file and ensure all required variables are set correctly.
```

## Security Best Practices

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use strong secrets** - Minimum 32 characters for SESSION_SECRET and JWT_SECRET
3. **Enable secure cookies in production** - Set `SESSION_COOKIE_SECURE=true`
4. **Restrict CORS origins** - Only allow trusted frontend URLs
5. **Use environment-specific .env files** - Different values for dev/staging/production

## Troubleshooting

### Application won't start

Check that:
- All required environment variables are set in `.env`
- Secrets are at least 32 characters long
- URLs are valid and properly formatted
- MongoDB URI starts with `mongodb://` or `mongodb+srv://`

### Can't connect to MongoDB/Redis

Verify:
- Services are running (`mongod`, `redis-server`)
- Connection URLs are correct
- Network/firewall settings allow connections

### OAuth not working

Ensure:
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- `GOOGLE_CALLBACK_URL` matches Google Console configuration
- Callback URL is accessible from the internet (for production)
