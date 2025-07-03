/**
 * Example usage of the Redis caching service
 * This file demonstrates various caching patterns and best practices
 */

import {
  cacheService,
  Cacheable,
  CacheEvict,
  CachePut,
  userCacheKey,
  CacheInvalidator,
  redisRateLimit,
  createApiRateLimiter,
} from '../index';
import { Request, Response, Router } from 'express';

// ==========================================
// 1. Basic Cache Service Usage
// ==========================================

export class BasicCacheExample {
  async demonstrateBasicOperations() {
    // Set a simple value
    await cacheService.set(
      'user:123',
      { name: 'John Doe', email: 'john@example.com' },
      { ttl: 3600 }
    );

    // Get a value
    const user = await cacheService.get<{ name: string; email: string }>('user:123');
    console.log('User:', user);

    // Check existence
    const exists = await cacheService.exists('user:123');
    console.log('Exists:', exists);

    // Delete a value
    await cacheService.delete('user:123');

    // Set multiple values
    await cacheService.mset(
      {
        'product:1': { name: 'Product 1', price: 100 },
        'product:2': { name: 'Product 2', price: 200 },
      },
      { ttl: 1800 }
    );

    // Get multiple values
    const products = await cacheService.mget<{ name: string; price: number }>([
      'product:1',
      'product:2',
    ]);
    console.log('Products:', products);
  }
}

// ==========================================
// 2. Using Decorators for Automatic Caching
// ==========================================

export class UserService {
  /**
   * Automatically cache user data
   */
  @Cacheable({
    ttl: 3600, // 1 hour
    prefix: 'user-service',
    key: (userId: string) => `user:${userId}`,
  })
  async getUser(userId: string) {
    console.log('Fetching user from database...');
    // Simulate database call
    return {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date(),
    };
  }

  /**
   * Cache with condition
   */
  @Cacheable({
    ttl: 1800,
    condition: (userId: string, includeDetails: boolean) => includeDetails,
    key: (userId: string, includeDetails: boolean) => `user:${userId}:detailed`,
  })
  async getUserWithDetails(userId: string, includeDetails: boolean = true) {
    const user = await this.getUser(userId);
    if (includeDetails) {
      return {
        ...user,
        preferences: { theme: 'dark', language: 'en' },
        stats: { posts: 42, followers: 100 },
      };
    }
    return user;
  }

  /**
   * Update user and evict cache
   */
  @CacheEvict({
    prefix: 'user-service',
    key: (userId: string) => `user:${userId}`,
  })
  async updateUser(userId: string, data: any) {
    console.log('Updating user in database...');
    // Update logic here
    return { id: userId, ...data };
  }

  /**
   * Update and cache the new value
   */
  @CachePut({
    ttl: 3600,
    prefix: 'user-service',
    key: (userId: string) => `user:${userId}`,
  })
  async updateAndCacheUser(userId: string, data: any) {
    console.log('Updating user and caching new value...');
    // Update logic here
    return { id: userId, ...data, updatedAt: new Date() };
  }

  /**
   * Delete user and clear all related cache
   */
  @CacheEvict({
    prefix: 'user-service',
    allEntries: true,
  })
  async deleteUser(userId: string) {
    console.log('Deleting user and clearing all cache...');
    // Delete logic here
  }
}

// ==========================================
// 3. Cache Invalidation Patterns
// ==========================================

export class ProductService {
  async updateProduct(productId: string, data: any) {
    // Update product in database
    console.log('Updating product...');

    // Invalidate specific product cache
    await CacheInvalidator.invalidateResourceById('product', productId);

    // Invalidate related caches
    await CacheInvalidator.invalidateRelated('product', productId, ['category', 'search']);

    return { id: productId, ...data };
  }

  async bulkUpdateProducts(categoryId: string) {
    // Bulk update logic
    console.log('Bulk updating products...');

    // Invalidate all product lists and searches
    await CacheInvalidator.invalidateResource('product');
    await CacheInvalidator.invalidateResourceById('category', categoryId);
  }
}

// ==========================================
// 4. Session Management with Cache
// ==========================================

export class SessionService {
  async createSession(userId: string, sessionData: any) {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionKey = `session:${sessionId}`;

    await cacheService.set(
      sessionKey,
      {
        userId,
        ...sessionData,
        createdAt: new Date(),
      },
      { ttl: 86400 }
    ); // 24 hours

    return sessionId;
  }

  async getSession(sessionId: string) {
    const sessionKey = `session:${sessionId}`;
    return await cacheService.get(sessionKey);
  }

  async refreshSession(sessionId: string) {
    const sessionKey = `session:${sessionId}`;
    await cacheService.expire(sessionKey, 86400); // Extend by 24 hours
  }

  async destroySession(sessionId: string) {
    await CacheInvalidator.invalidateSession(sessionId);
  }
}

// ==========================================
// 5. Rate Limiting Examples
// ==========================================

export const rateLimitingExamples = {
  // Basic rate limiting middleware
  basicRateLimit: redisRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP',
  }),

  // API rate limiting with user awareness
  apiRateLimit: createApiRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Higher limit for authenticated users
  }),

  // Strict rate limit for sensitive endpoints
  authRateLimit: redisRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Only 5 attempts in 15 minutes
    message: 'Too many authentication attempts',
    keyGenerator: (req) => `auth:${req.ip}`,
    skipSuccessfulRequests: true, // Only count failed attempts
  }),

  // Custom rate limiter for file uploads
  uploadRateLimit: redisRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    keyGenerator: (req) => {
      const user = (req as any).user;
      return user ? `upload:user:${user.id}` : `upload:ip:${req.ip}`;
    },
  }),
};

// ==========================================
// 6. Complex Caching Patterns
// ==========================================

export class AnalyticsService {
  /**
   * Cache with multiple invalidation strategies
   */
  @Cacheable({
    ttl: 3600,
    key: (userId: string, period: string) => `analytics:${userId}:${period}`,
  })
  async getUserAnalytics(userId: string, period: string = 'daily') {
    console.log('Calculating user analytics...');
    // Complex calculation
    return {
      userId,
      period,
      views: 1000,
      engagement: 0.75,
      calculatedAt: new Date(),
    };
  }

  /**
   * Warm cache for frequently accessed data
   */
  async warmAnalyticsCache(userIds: string[]) {
    const warmingTasks = userIds.map((userId) => ({
      key: `analytics:${userId}:daily`,
      loader: () => this.getUserAnalytics(userId, 'daily'),
      ttl: 3600,
    }));

    await CacheWarmer.warmMultiple(warmingTasks);
  }
}

// ==========================================
// 7. Cache-Aside Pattern Implementation
// ==========================================

export class CacheAsideExample {
  async getDataWithCacheAside(key: string, dataLoader: () => Promise<any>, ttl: number = 3600) {
    // Try to get from cache
    let data = await cacheService.get(key);

    if (data === null) {
      // Cache miss - load from source
      data = await dataLoader();

      // Store in cache for next time
      if (data !== null && data !== undefined) {
        await cacheService.set(key, data, { ttl });
      }
    }

    return data;
  }
}

// ==========================================
// 8. Using Cache in Express Routes
// ==========================================

import { cacheMiddleware, routeCache } from '../../../middlewares/cache.middleware';

export function setupCachedRoutes() {
  const router = Router();

  // Cache all GET requests for 5 minutes
  router.use(
    cacheMiddleware({
      ttl: 300,
      excludePaths: ['/api/auth/*', '/api/admin/*'],
    })
  );

  // Cache specific route for 1 hour
  router.get('/api/products', routeCache(3600), async (req: Request, res: Response) => {
    // This response will be cached
    const products = await getProducts();
    res.json(products);
  });

  // Custom cache key based on query params
  router.get(
    '/api/search',
    routeCache(1800, (req) => `search:${req.query.q}:${req.query.category || 'all'}`),
    async (req: Request, res: Response) => {
      const results = await searchProducts(req.query);
      res.json(results);
    }
  );

  return router;
}

// Helper functions (mock implementations)
async function getProducts() {
  return [{ id: 1, name: 'Product 1' }];
}

async function searchProducts(query: any) {
  return { results: [], query };
}
