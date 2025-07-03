import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../CacheService';
import { rateLimitKey } from './cacheKeyGenerators';
import { AppError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Maximum requests per window
  message?: string; // Error message
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  skip?: (req: Request) => boolean | Promise<boolean>; // Skip rate limiting
  handler?: (req: Request, res: Response) => void; // Custom handler
  onLimitReached?: (req: Request) => void | Promise<void>; // Callback when limit reached
}

/**
 * Redis-based rate limiter middleware
 */
export function redisRateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests, please try again later.',
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    skip,
    handler,
    onLimitReached,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if should skip
      if (skip && (await skip(req))) {
        return next();
      }

      const key = keyGenerator(req);
      const windowKey = generateWindowKey(key, windowMs);
      const rateLimitCacheKey = rateLimitKey(key, windowKey);

      // Get current count
      const current = await cacheService.increment(rateLimitCacheKey, 0, {
        ttl: Math.ceil(windowMs / 1000),
      });

      if (current === null) {
        // Redis not available, allow request
        logger.warn('Redis not available for rate limiting');
        return next();
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current).toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

      // Check if limit exceeded
      if (current >= max) {
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000).toString());

        // Call onLimitReached callback
        if (onLimitReached) {
          await onLimitReached(req);
        }

        // Use custom handler if provided
        if (handler) {
          return handler(req, res);
        }

        throw new AppError(message, 429);
      }

      // Increment counter before processing request
      await cacheService.increment(rateLimitCacheKey, 1, {
        ttl: Math.ceil(windowMs / 1000),
      });

      // Handle response to potentially decrement counter
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalSend = res.send;
        res.send = function (data: any): any {
          const shouldDecrement =
            (skipSuccessfulRequests && res.statusCode < 400) ||
            (skipFailedRequests && res.statusCode >= 400);

          if (shouldDecrement) {
            cacheService.decrement(rateLimitCacheKey, 1).catch((err) => {
              logger.error('Failed to decrement rate limit counter:', err);
            });
          }

          return originalSend.call(res, data);
        };
      }

      next();
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 429) {
        next(error);
      } else {
        logger.error('Rate limiter error:', error);
        // Allow request on error
        next();
      }
    }
  };
}

/**
 * Sliding window rate limiter using Redis sorted sets
 */
export function slidingWindowRateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests, please try again later.',
    keyGenerator = defaultKeyGenerator,
    skip,
    handler,
    onLimitReached,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if should skip
      if (skip && (await skip(req))) {
        return next();
      }

      const key = `sliding:${keyGenerator(req)}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis directly for sorted set operations
      const client = (cacheService as any).client;
      if (!client || !(cacheService as any).isConnected) {
        logger.warn('Redis not available for sliding window rate limiting');
        return next();
      }

      // Remove old entries
      await client.zremrangebyscore(key, '-inf', windowStart);

      // Count current entries in window
      const count = await client.zcard(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      // Check if limit exceeded
      if (count >= max) {
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000).toString());

        // Call onLimitReached callback
        if (onLimitReached) {
          await onLimitReached(req);
        }

        // Use custom handler if provided
        if (handler) {
          return handler(req, res);
        }

        throw new AppError(message, 429);
      }

      // Add current request
      await client.zadd(key, now, `${now}-${Math.random()}`);
      await client.expire(key, Math.ceil(windowMs / 1000));

      next();
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 429) {
        next(error);
      } else {
        logger.error('Sliding window rate limiter error:', error);
        // Allow request on error
        next();
      }
    }
  };
}

/**
 * Distributed rate limiter for API keys or user IDs
 */
export class DistributedRateLimiter {
  private windowMs: number;
  private max: number;

  constructor(windowMs: number = 15 * 60 * 1000, max: number = 100) {
    this.windowMs = windowMs;
    this.max = max;
  }

  /**
   * Check if rate limit exceeded
   */
  async isRateLimited(identifier: string): Promise<boolean> {
    const windowKey = generateWindowKey(identifier, this.windowMs);
    const key = rateLimitKey(identifier, windowKey);

    const count = await cacheService.increment(key, 0, {
      ttl: Math.ceil(this.windowMs / 1000),
    });

    return count !== null && count >= this.max;
  }

  /**
   * Consume a request from the rate limit
   */
  async consume(
    identifier: string,
    points: number = 1
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    const windowKey = generateWindowKey(identifier, this.windowMs);
    const key = rateLimitKey(identifier, windowKey);

    const count = await cacheService.increment(key, points, {
      ttl: Math.ceil(this.windowMs / 1000),
    });

    if (count === null) {
      // Redis not available
      return {
        allowed: true,
        remaining: this.max,
        resetAt: new Date(Date.now() + this.windowMs),
      };
    }

    const allowed = count <= this.max;
    const remaining = Math.max(0, this.max - count);
    const resetAt = new Date(Date.now() + this.windowMs);

    // If not allowed, decrement back
    if (!allowed) {
      await cacheService.decrement(key, points);
    }

    return { allowed, remaining, resetAt };
  }

  /**
   * Get current rate limit status
   */
  async getStatus(identifier: string): Promise<{
    count: number;
    remaining: number;
    resetAt: Date;
  }> {
    const windowKey = generateWindowKey(identifier, this.windowMs);
    const key = rateLimitKey(identifier, windowKey);

    const count =
      (await cacheService.increment(key, 0, {
        ttl: Math.ceil(this.windowMs / 1000),
      })) || 0;

    return {
      count,
      remaining: Math.max(0, this.max - count),
      resetAt: new Date(Date.now() + this.windowMs),
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string): Promise<void> {
    const windowKey = generateWindowKey(identifier, this.windowMs);
    const key = rateLimitKey(identifier, windowKey);
    await cacheService.delete(key);
  }
}

/**
 * Token bucket rate limiter
 */
export class TokenBucketRateLimiter {
  private capacity: number;
  private refillRate: number; // tokens per second
  private prefix: string;

  constructor(capacity: number, refillRate: number, prefix: string = 'bucket') {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.prefix = prefix;
  }

  /**
   * Consume tokens from the bucket
   */
  async consume(
    identifier: string,
    tokens: number = 1
  ): Promise<{
    allowed: boolean;
    remaining: number;
  }> {
    const key = `${this.prefix}:${identifier}`;
    const now = Date.now();

    // Get current bucket state
    const bucketData = await cacheService.get<{
      tokens: number;
      lastRefill: number;
    }>(key);

    let currentTokens: number;
    let lastRefill: number;

    if (bucketData) {
      // Calculate tokens to add based on time passed
      const timePassed = (now - bucketData.lastRefill) / 1000;
      const tokensToAdd = timePassed * this.refillRate;
      currentTokens = Math.min(this.capacity, bucketData.tokens + tokensToAdd);
      lastRefill = now;
    } else {
      // Initialize bucket
      currentTokens = this.capacity;
      lastRefill = now;
    }

    // Check if enough tokens available
    if (currentTokens >= tokens) {
      currentTokens -= tokens;

      // Save updated bucket state
      await cacheService.set(
        key,
        {
          tokens: currentTokens,
          lastRefill,
        },
        { ttl: 3600 }
      ); // 1 hour TTL

      return { allowed: true, remaining: currentTokens };
    }

    // Not enough tokens - save current state without consuming
    await cacheService.set(
      key,
      {
        tokens: currentTokens,
        lastRefill,
      },
      { ttl: 3600 }
    );

    return { allowed: false, remaining: currentTokens };
  }
}

// Helper functions

function defaultKeyGenerator(req: Request): string {
  // Use IP address by default, with support for proxies
  const ip =
    req.ip ||
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    'unknown';

  return Array.isArray(ip) ? (ip[0] as string) : (ip as string);
}

function generateWindowKey(_identifier: string, windowMs: number): string {
  const window = Math.floor(Date.now() / windowMs);
  return `${window}`;
}

/**
 * Create a rate limiter for specific routes
 */
export function createRouteRateLimiter(
  route: string,
  options: RateLimitOptions = {}
): ReturnType<typeof redisRateLimit> {
  return redisRateLimit({
    ...options,
    keyGenerator: (req) => `route:${route}:${defaultKeyGenerator(req)}`,
  });
}

/**
 * Create a rate limiter for API endpoints
 */
export function createApiRateLimiter(
  options: RateLimitOptions = {}
): ReturnType<typeof redisRateLimit> {
  return redisRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    ...options,
    keyGenerator: (req) => {
      const user = (req as any).user;
      if (user?.id) {
        return `api:user:${user.id}`;
      }
      return `api:ip:${defaultKeyGenerator(req)}`;
    },
  });
}
