import rateLimit from 'express-rate-limit';
import { config } from '@config/environment';
import { ResponseUtil } from '@utils/response';
import { redisRateLimit, createApiRateLimiter, cacheService } from '@services/cache';

// Use Redis-based rate limiting if Redis is available, otherwise fall back to memory store
const useRedisStore = () => cacheService.isRedisConnected();

// Main rate limiter with Redis support
export const rateLimiter = useRedisStore()
  ? redisRateLimit({
      windowMs: config.rateLimiting.windowMs,
      max: config.rateLimiting.maxRequests,
      message: 'Too many requests from this IP, please try again later.',
      skip: (_req) => config.isTest,
      handler: (_req, res) => {
        ResponseUtil.tooManyRequests(res);
      },
    })
  : rateLimit({
      windowMs: config.rateLimiting.windowMs,
      max: config.rateLimiting.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        ResponseUtil.tooManyRequests(res);
      },
      skip: (_req) => config.isTest,
    });

// Auth rate limiter with Redis support
export const authRateLimiter = useRedisStore()
  ? redisRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
      message: 'Too many authentication attempts, please try again later',
      keyGenerator: (req) => `auth:${req.ip}`,
      skipSuccessfulRequests: true, // Only count failed attempts
      skip: (_req) => config.isTest,
      handler: (_req, res) => {
        ResponseUtil.tooManyRequests(
          res,
          'Too many authentication attempts, please try again later'
        );
      },
    })
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        ResponseUtil.tooManyRequests(
          res,
          'Too many authentication attempts, please try again later'
        );
      },
      skip: (_req) => config.isTest,
    });

// API rate limiter with user awareness
export const apiRateLimiter = useRedisStore()
  ? createApiRateLimiter({
      windowMs: config.rateLimiting.windowMs,
      max: config.rateLimiting.maxRequests * 10, // Higher limit for authenticated users
      skip: (_req) => config.isTest,
    })
  : rateLimit({
      windowMs: config.rateLimiting.windowMs,
      max: config.rateLimiting.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (_req) => config.isTest,
    });

// Create custom rate limiter with Redis support
export const createCustomRateLimiter = (windowMs: number, max: number, keyPrefix?: string) => {
  if (useRedisStore()) {
    return redisRateLimit({
      windowMs,
      max,
      keyGenerator: keyPrefix ? (req) => `${keyPrefix}:${req.ip}` : undefined,
      skip: (_req) => config.isTest,
      handler: (_req, res) => {
        ResponseUtil.tooManyRequests(res);
      },
    });
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      ResponseUtil.tooManyRequests(res);
    },
    skip: (_req) => config.isTest,
  });
};
