# Rate Limiting Implementation

📑 **Table of Contents**
- [Overview](#overview)
- [Configuration](#configuration)
- [Features](#features)
  - [1. Concurrent Stream Limiting](#1-concurrent-stream-limiting)
  - [2. Hourly Message Limiting](#2-hourly-message-limiting)
  - [3. Daily Message Limiting](#3-daily-message-limiting)
  - [4. Daily Token Limiting](#4-daily-token-limiting)
- [Implementation Details](#implementation-details)
  - [Middleware](#middleware)
  - [Storage](#storage)
- [Monitoring](#monitoring)
  - [Check Your Stats](#check-your-stats)
  - [Admin View (Global Stats)](#admin-view-global-stats)
- [Logs](#logs)
- [Configuration Examples](#configuration-examples)
  - [Development (Relaxed Limits)](#development-relaxed-limits)
  - [Production (Strict Limits)](#production-strict-limits)
  - [Free Tier](#free-tier)
  - [Pro Tier](#pro-tier)
  - [Disable (Testing Only)](#disable-testing-only)
- [User Tiers (Future Enhancement)](#user-tiers-future-enhancement)
- [Benefits](#benefits)
- [Next Steps](#next-steps)
- [Troubleshooting](#troubleshooting)
  - ["Rate limit exceeded" but I haven't used much](#rate-limit-exceeded-but-i-havent-used-much)
  - [Rate limits reset unexpectedly](#rate-limits-reset-unexpectedly)
  - [Different servers show different limits](#different-servers-show-different-limits)
  - [How to temporarily disable for testing](#how-to-temporarily-disable-for-testing)
- [Files](#files)

---

## Overview

Rate limiting is implemented to protect the streaming endpoints from abuse, control costs, and ensure fair resource allocation across all users.

## Configuration

All rate limits are **configurable via environment variables** in `.env`:

```env
# Enable/disable rate limiting
RATE_LIMIT_ENABLED=true

# Max concurrent streaming sessions per user
RATE_LIMIT_CONCURRENT_STREAMS=5

# Max messages per hour per user
RATE_LIMIT_MESSAGES_PER_HOUR=100

# Max messages per day per user
RATE_LIMIT_MESSAGES_PER_DAY=1000

# Max tokens per day per user (cost control)
RATE_LIMIT_TOKENS_PER_DAY=50000
```

## Features

### 1. Concurrent Stream Limiting
Prevents a single user from opening too many simultaneous streaming connections.

**Default**: 5 concurrent streams  
**Why**: Each stream consumes server memory/CPU. Too many = server crash.

**Example**:
```javascript
// User opens 5 chat streams - all work fine
// User tries to open 6th stream:
// Response: 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "message": "Too many concurrent streams. Maximum 5 allowed.",
  "retryAfter": 60,
  "limits": {
    "concurrentStreams": {
      "current": 5,
      "max": 5
    }
  }
}
```

### 2. Hourly Message Limiting
Prevents spam and excessive API usage within an hour.

**Default**: 100 messages per hour  
**Why**: Limits short-term bursts of activity.

**Example**:
```javascript
// User sends 100 messages this hour
// User tries to send 101st message:
// Response: 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "message": "Too many messages this hour. Maximum 100 per hour allowed.",
  "retryAfter": 3600,
  "limits": {
    "messagesThisHour": {
      "current": 100,
      "max": 100
    }
  }
}
```

### 3. Daily Message Limiting
Prevents long-term abuse and ensures fair usage.

**Default**: 1000 messages per day  
**Why**: Prevents sustained high usage patterns.

### 4. Daily Token Limiting
Controls API costs by limiting total tokens consumed per day.

**Default**: 50,000 tokens per day  
**Why**: LLM APIs charge per token. Prevents cost explosions.

**Note**: This is tracked but not enforced yet (warning only).

## Implementation Details

### Middleware
```typescript
import { streamRateLimiter, trackTokenUsage } from '../middleware/rateLimiter';

// Apply to streaming route
router.get('/message/stream', 
  authenticateToken,      // 1. Authenticate first
  streamRateLimiter,      // 2. Check rate limits
  async (req, res) => {   // 3. Process request
    // ... streaming logic
    
    // Track tokens at end
    trackTokenUsage(userId, tokenCount);
  }
);
```

### Storage
Currently uses **in-memory storage** (Map).

**Implications**:
- ✅ Simple, no external dependencies
- ✅ Fast access
- ⚠️ Resets on server restart
- ⚠️ Won't work with multiple servers (each has own memory)

**Production Recommendation**: Use **Redis** for:
- Persistent storage (survives restarts)
- Shared state across multiple servers
- Built-in expiration (automatic cleanup)

## Monitoring

### Check Your Stats
```bash
# Get your current usage
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/chat/rate-limit/stats

# Response:
{
  "userId": "user@example.com",
  "stats": {
    "concurrentStreams": {
      "current": 2,
      "max": 5
    },
    "messagesThisHour": {
      "current": 23,
      "max": 100
    },
    "messagesToday": {
      "current": 156,
      "max": 1000
    },
    "tokensToday": {
      "current": 12450,
      "max": 50000
    }
  }
}
```

### Admin View (Global Stats)
If user has `role: 'admin'`:
```json
{
  "userId": "admin@example.com",
  "stats": { ... },
  "global": {
    "enabled": true,
    "maxConcurrentStreams": 5,
    "maxMessagesPerHour": 100,
    "maxMessagesPerDay": 1000,
    "maxTokensPerDay": 50000,
    "totalUsers": 47,
    "activeStreams": 12
  }
}
```

## Logs

Rate limiter logs all activity:

```
[RateLimiter] User user@example.com - Concurrent: 3/5, Hourly: 45/100, Daily: 230/1000
[RateLimiter] User user@example.com used 156 tokens - Daily total: 12450/50000
[RateLimiter] User spammer@example.com exceeded concurrent streams limit: 5/5
[RateLimiter] User spammer@example.com approaching daily token limit: 46,234/50,000
```

## Configuration Examples

### Development (Relaxed Limits)
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_CONCURRENT_STREAMS=10
RATE_LIMIT_MESSAGES_PER_HOUR=500
RATE_LIMIT_MESSAGES_PER_DAY=5000
RATE_LIMIT_TOKENS_PER_DAY=100000
```

### Production (Strict Limits)
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_CONCURRENT_STREAMS=3
RATE_LIMIT_MESSAGES_PER_HOUR=50
RATE_LIMIT_MESSAGES_PER_DAY=500
RATE_LIMIT_TOKENS_PER_DAY=25000
```

### Free Tier
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_CONCURRENT_STREAMS=2
RATE_LIMIT_MESSAGES_PER_HOUR=20
RATE_LIMIT_MESSAGES_PER_DAY=100
RATE_LIMIT_TOKENS_PER_DAY=10000
```

### Pro Tier
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_CONCURRENT_STREAMS=10
RATE_LIMIT_MESSAGES_PER_HOUR=200
RATE_LIMIT_MESSAGES_PER_DAY=2000
RATE_LIMIT_TOKENS_PER_DAY=100000
```

### Disable (Testing Only)
```env
RATE_LIMIT_ENABLED=false
```

## User Tiers (Future Enhancement)

You can implement tiered rate limits by checking user's subscription level:

```typescript
// In rateLimiter.ts
function getConfigForUser(user: any): RateLimitConfig {
  const tier = user.subscriptionTier || 'free';
  
  switch (tier) {
    case 'enterprise':
      return {
        maxConcurrentStreams: 20,
        maxMessagesPerHour: 500,
        maxMessagesPerDay: 10000,
        maxTokensPerDay: 500000,
        enabled: true
      };
    case 'pro':
      return {
        maxConcurrentStreams: 10,
        maxMessagesPerHour: 200,
        maxMessagesPerDay: 2000,
        maxTokensPerDay: 100000,
        enabled: true
      };
    case 'free':
    default:
      return {
        maxConcurrentStreams: 2,
        maxMessagesPerHour: 20,
        maxMessagesPerDay: 100,
        maxTokensPerDay: 10000,
        enabled: true
      };
  }
}
```

## Benefits

✅ **Cost Control**: Prevent unlimited LLM API costs  
✅ **Fair Usage**: Resources available for all users  
✅ **Security**: Protection against DoS attacks  
✅ **Scalability**: Know your capacity limits  
✅ **User Tiers**: Monetization via usage limits  
✅ **Debugging**: Clear error messages with retry info  

## Next Steps

1. **Monitor Usage**: Check logs for users hitting limits
2. **Adjust Limits**: Tune based on real usage patterns
3. **Add Redis**: For production multi-server deployment
4. **Implement Tiers**: Different limits per subscription level
5. **Add Billing**: Charge for overages or upgrade prompts
6. **Add Alerting**: Notify when users approach limits

## Troubleshooting

### "Rate limit exceeded" but I haven't used much
- Check if you have multiple browser tabs open (counts as concurrent streams)
- Check if you're testing with automated scripts
- Check logs to see actual usage: `GET /api/chat/rate-limit/stats`

### Rate limits reset unexpectedly
- Server restart clears in-memory storage
- Solution: Implement Redis for persistence

### Different servers show different limits
- In-memory storage is per-server instance
- Solution: Implement Redis for shared state

### How to temporarily disable for testing
```env
RATE_LIMIT_ENABLED=false
```

## Files

- `backend-node/src/middleware/rateLimiter.ts` - Main implementation
- `backend-node/src/routes/chat-routes.ts` - Applied to streaming routes
- `backend-node/.env` - Configuration
- `backend-node/RATE_LIMITING.md` - This document

---

**Status**: ✅ Implemented and Active  
**Storage**: In-Memory (recommend Redis for production)  
**Configurable**: Yes (via environment variables)  
**Default State**: Enabled with conservative limits
