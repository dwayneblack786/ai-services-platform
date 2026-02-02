import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { env } from '../config/env';

/**
 * Rate Limiter Configuration
 * All limits configurable via environment variables
 */
interface RateLimitConfig {
  maxConcurrentStreams: number;
  maxMessagesPerHour: number;
  maxMessagesPerDay: number;
  maxTokensPerDay: number;
  enabled: boolean;
}

const config: RateLimitConfig = {
  maxConcurrentStreams: env.RATE_LIMIT_CONCURRENT_STREAMS,
  maxMessagesPerHour: env.RATE_LIMIT_MESSAGES_PER_HOUR,
  maxMessagesPerDay: env.RATE_LIMIT_MESSAGES_PER_DAY,
  maxTokensPerDay: env.RATE_LIMIT_TOKENS_PER_DAY,
  enabled: env.RATE_LIMIT_ENABLED
};

/**
 * In-memory storage for rate limiting
 * For production with multiple servers, use Redis instead
 */
interface UserLimits {
  concurrentStreams: number;
  hourlyMessages: Map<number, number>; // hour -> count
  dailyMessages: Map<string, number>; // date -> count
  dailyTokens: Map<string, number>; // date -> count
}

const userLimits = new Map<string, UserLimits>();

/**
 * Get current hour key (0-23)
 */
function getCurrentHour(): number {
  return new Date().getHours();
}

/**
 * Get current date key (YYYY-MM-DD)
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get or initialize user limits
 */
function getUserLimits(userId: string): UserLimits {
  if (!userLimits.has(userId)) {
    userLimits.set(userId, {
      concurrentStreams: 0,
      hourlyMessages: new Map(),
      dailyMessages: new Map(),
      dailyTokens: new Map()
    });
  }
  return userLimits.get(userId)!;
}

/**
 * Clean up old data (run periodically)
 */
function cleanupOldData() {
  const currentHour = getCurrentHour();
  const currentDate = getCurrentDate();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  userLimits.forEach((limits, userId) => {
    // Clean old hourly data (keep current + last hour)
    limits.hourlyMessages.forEach((count, hour) => {
      if (hour !== currentHour && hour !== (currentHour - 1 + 24) % 24) {
        limits.hourlyMessages.delete(hour);
      }
    });

    // Clean old daily data (keep today + yesterday)
    limits.dailyMessages.forEach((count, date) => {
      if (date !== currentDate && date !== yesterdayStr) {
        limits.dailyMessages.delete(date);
      }
    });

    limits.dailyTokens.forEach((count, date) => {
      if (date !== currentDate && date !== yesterdayStr) {
        limits.dailyTokens.delete(date);
      }
    });
  });
}

// Run cleanup every hour
setInterval(cleanupOldData, 60 * 60 * 1000);

/**
 * Stream Rate Limiter Middleware
 * Limits concurrent streams and message rates per user
 */
export function streamRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting if disabled
  if (!config.enabled) {
    logger.debug('Rate limiting disabled');
    return next();
  }

  const userId = req.user?.id || req.user?.email || 'anonymous';
  const limits = getUserLimits(userId);
  const currentHour = getCurrentHour();
  const currentDate = getCurrentDate();

  // Check 1: Concurrent streams limit
  if (limits.concurrentStreams >= config.maxConcurrentStreams) {
    logger.warn('User exceeded concurrent streams limit', { 
      userId, 
      current: limits.concurrentStreams, 
      max: config.maxConcurrentStreams 
    });
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Too many concurrent streams. Maximum ${config.maxConcurrentStreams} allowed.`,
      retryAfter: 60,
      limits: {
        concurrentStreams: {
          current: limits.concurrentStreams,
          max: config.maxConcurrentStreams
        }
      }
    });
  }

  // Check 2: Hourly message limit
  const hourlyCount = limits.hourlyMessages.get(currentHour) || 0;
  if (hourlyCount >= config.maxMessagesPerHour) {
    logger.warn('User exceeded hourly message limit', { 
      userId, 
      hourlyCount, 
      maxHourly: config.maxMessagesPerHour 
    });
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Too many messages this hour. Maximum ${config.maxMessagesPerHour} per hour allowed.`,
      retryAfter: 3600,
      limits: {
        messagesThisHour: {
          current: hourlyCount,
          max: config.maxMessagesPerHour
        }
      }
    });
  }

  // Check 3: Daily message limit
  const dailyMessageCount = limits.dailyMessages.get(currentDate) || 0;
  if (dailyMessageCount >= config.maxMessagesPerDay) {
    logger.warn('User exceeded daily message limit', { 
      userId, 
      dailyCount: dailyMessageCount, 
      maxDaily: config.maxMessagesPerDay 
    });
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Daily message limit reached. Maximum ${config.maxMessagesPerDay} per day allowed.`,
      retryAfter: 86400,
      limits: {
        messagesToday: {
          current: dailyMessageCount,
          max: config.maxMessagesPerDay
        }
      }
    });
  }

  // Increment counters
  limits.concurrentStreams++;
  limits.hourlyMessages.set(currentHour, hourlyCount + 1);
  limits.dailyMessages.set(currentDate, dailyMessageCount + 1);

  logger.debug('Rate limiter status', {
    userId,
    concurrent: `${limits.concurrentStreams}/${config.maxConcurrentStreams}`,
    hourly: `${hourlyCount + 1}/${config.maxMessagesPerHour}`,
    daily: `${dailyMessageCount + 1}/${config.maxMessagesPerDay}`
  });

  // Decrement concurrent counter when stream ends
  const decrementConcurrent = () => {
    limits.concurrentStreams = Math.max(0, limits.concurrentStreams - 1);
    logger.debug('User stream ended', {
      userId,
      concurrent: `${limits.concurrentStreams}/${config.maxConcurrentStreams}`
    });
  };

  res.on('close', decrementConcurrent);
  res.on('finish', decrementConcurrent);

  next();
}

/**
 * Track token usage (call this when stream completes)
 */
export function trackTokenUsage(userId: string, tokenCount: number) {
  if (!config.enabled) {return;}

  const limits = getUserLimits(userId);
  const currentDate = getCurrentDate();
  const currentTokens = limits.dailyTokens.get(currentDate) || 0;
  limits.dailyTokens.set(currentDate, currentTokens + tokenCount);

  logger.debug('Token usage recorded', {
    userId,
    tokensUsed: tokenCount,
    dailyTotal: currentTokens + tokenCount,
    maxDaily: config.maxTokensPerDay
  });

  // Check if approaching limit
  if (currentTokens + tokenCount > config.maxTokensPerDay * 0.9) {
    logger.warn('User approaching daily token limit', {
      userId,
      current: currentTokens + tokenCount,
      max: config.maxTokensPerDay,
      percentUsed: Math.round(((currentTokens + tokenCount) / config.maxTokensPerDay) * 100)
    });
  }
}

/**
 * Check if user has exceeded token limit (optional check before starting stream)
 */
export function checkTokenLimit(userId: string): boolean {
  if (!config.enabled) {return true;}

  const limits = getUserLimits(userId);
  const currentDate = getCurrentDate();
  const currentTokens = limits.dailyTokens.get(currentDate) || 0;

  return currentTokens < config.maxTokensPerDay;
}

/**
 * Get current usage stats for a user
 */
export function getUserStats(userId: string) {
  const limits = getUserLimits(userId);
  const currentHour = getCurrentHour();
  const currentDate = getCurrentDate();

  return {
    concurrentStreams: {
      current: limits.concurrentStreams,
      max: config.maxConcurrentStreams
    },
    messagesThisHour: {
      current: limits.hourlyMessages.get(currentHour) || 0,
      max: config.maxMessagesPerHour
    },
    messagesToday: {
      current: limits.dailyMessages.get(currentDate) || 0,
      max: config.maxMessagesPerDay
    },
    tokensToday: {
      current: limits.dailyTokens.get(currentDate) || 0,
      max: config.maxTokensPerDay
    }
  };
}

/**
 * Get rate limiter configuration (for admin/debugging)
 */
export function getRateLimiterConfig() {
  return {
    ...config,
    totalUsers: userLimits.size,
    activeStreams: Array.from(userLimits.values()).reduce((sum, limits) => sum + limits.concurrentStreams, 0)
  };
}
