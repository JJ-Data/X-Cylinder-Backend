import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache/CacheService';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export interface CacheMiddlewareOptions {
  ttl?: number;
  prefix?: string;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  excludePaths?: string[];
  includePaths?: string[];
  varyBy?: string[]; // Headers to vary cache by
  cachePrivate?: boolean;
  cacheControl?: string;
}

/**
 * HTTP Response caching middleware
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = 300, // 5 minutes default
    prefix = 'http',
    keyGenerator = defaultKeyGenerator,
    condition = () => true,
    excludePaths = [],
    includePaths = [],
    varyBy = [],
    cachePrivate = false,
    cacheControl,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check if path should be cached
    if (!shouldCachePath(req.path, includePaths, excludePaths)) {
      return next();
    }

    // Check custom condition
    if (!condition(req)) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator(req);
      const fullCacheKey = generateFullCacheKey(cacheKey, req, varyBy);

      // Try to get from cache
      const cachedData = await cacheService.get<CachedResponse>(fullCacheKey, { prefix });

      if (cachedData) {
        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', fullCacheKey);

        if (cachedData.headers) {
          Object.entries(cachedData.headers).forEach(([key, value]) => {
            res.set(key, value as string);
          });
        }

        // Set cache control headers
        setCacheControlHeaders(res, ttl, cachePrivate, cacheControl);

        return res.status(cachedData.statusCode || 200).json(cachedData.body);
      }

      // Cache MISS - capture response
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', fullCacheKey);

      // Store original methods
      const originalJson = res.json;
      const originalSend = res.send;

      // Override json method
      res.json = function (body: any) {
        // Cache the response
        cacheResponse(fullCacheKey, res.statusCode, body, res.getHeaders(), ttl, prefix);

        // Set cache control headers
        setCacheControlHeaders(res, ttl, cachePrivate, cacheControl);

        // Call original method
        return originalJson.call(res, body);
      };

      // Override send method for non-JSON responses
      res.send = function (body: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          let parsedBody = body;
          try {
            parsedBody = JSON.parse(body);
          } catch {
            // Not JSON, skip caching
            return originalSend.call(res, body);
          }

          cacheResponse(fullCacheKey, res.statusCode, parsedBody, res.getHeaders(), ttl, prefix);
        }

        // Set cache control headers
        setCacheControlHeaders(res, ttl, cachePrivate, cacheControl);

        return originalSend.call(res, body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Route-specific cache middleware
 */
export function routeCache(ttl: number = 300, keyGenerator?: (req: Request) => string) {
  return cacheMiddleware({ ttl, keyGenerator });
}

/**
 * Clear cache for a specific route pattern
 */
export async function clearRouteCache(pattern: string, prefix: string = 'http'): Promise<void> {
  await cacheService.deletePattern(`${pattern}*`, { prefix });
  logger.info(`Cleared route cache for pattern: ${pattern}`);
}

/**
 * Cache invalidation middleware - clears cache after successful mutation
 */
export function cacheInvalidation(patterns: string[] | ((req: Request) => string[])) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to invalidate cache after successful response
    const invalidateCache = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patternsToInvalidate = typeof patterns === 'function' ? patterns(req) : patterns;

        for (const pattern of patternsToInvalidate) {
          await clearRouteCache(pattern);
        }
      }
    };

    res.json = function (body: any) {
      invalidateCache();
      return originalJson.call(res, body);
    };

    res.send = function (body: any) {
      invalidateCache();
      return originalSend.call(res, body);
    };

    next();
  };
}

// Helper functions

interface CachedResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string | string[]>;
  cachedAt: number;
}

function defaultKeyGenerator(req: Request): string {
  const { path, query } = req;
  const queryString = Object.keys(query).length > 0 ? JSON.stringify(query) : '';
  return `${path}:${queryString}`;
}

function generateFullCacheKey(baseKey: string, req: Request, varyBy: string[]): string {
  if (varyBy.length === 0) {
    return baseKey;
  }

  const varyValues = varyBy.map((header) => req.get(header) || '').join(':');
  const varyHash = crypto.createHash('md5').update(varyValues).digest('hex').substring(0, 8);

  return `${baseKey}:${varyHash}`;
}

function shouldCachePath(path: string, includePaths: string[], excludePaths: string[]): boolean {
  // If includePaths is specified, only cache those paths
  if (includePaths.length > 0) {
    return includePaths.some((pattern) => pathMatches(path, pattern));
  }

  // Otherwise, cache all paths except excluded ones
  if (excludePaths.length > 0) {
    return !excludePaths.some((pattern) => pathMatches(path, pattern));
  }

  return true;
}

function pathMatches(path: string, pattern: string): boolean {
  // Simple pattern matching (can be enhanced with glob patterns)
  if (pattern.endsWith('*')) {
    return path.startsWith(pattern.slice(0, -1));
  }
  return path === pattern;
}

async function cacheResponse(
  key: string,
  statusCode: number,
  body: any,
  headers: any,
  ttl: number,
  prefix: string
): Promise<void> {
  // Only cache successful responses
  if (statusCode >= 200 && statusCode < 300) {
    const cachedData: CachedResponse = {
      statusCode,
      body,
      headers: filterHeaders(headers),
      cachedAt: Date.now(),
    };

    await cacheService.set(key, cachedData, { ttl, prefix });
  }
}

function filterHeaders(headers: any): Record<string, string | string[]> {
  const headersToCache = ['content-type', 'content-encoding', 'content-language'];
  const filtered: Record<string, string | string[]> = {};

  headersToCache.forEach((header) => {
    if (headers[header]) {
      filtered[header] = headers[header];
    }
  });

  return filtered;
}

function setCacheControlHeaders(
  res: Response,
  ttl: number,
  cachePrivate: boolean,
  customCacheControl?: string
): void {
  if (customCacheControl) {
    res.set('Cache-Control', customCacheControl);
  } else {
    const cacheControl = [
      cachePrivate ? 'private' : 'public',
      `max-age=${ttl}`,
      's-maxage=300', // CDN cache
    ].join(', ');

    res.set('Cache-Control', cacheControl);
  }

  // Set Expires header
  const expires = new Date(Date.now() + ttl * 1000);
  res.set('Expires', expires.toUTCString());
}

/**
 * No-cache middleware to prevent caching
 */
export function noCache() {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  };
}
