# Redis Cache Service Documentation

## Overview

The Redis Cache Service provides a comprehensive caching solution with support for:
- Singleton pattern for consistent cache access
- Automatic JSON serialization/deserialization
- Decorators for method-level caching
- HTTP response caching middleware
- Redis-based rate limiting
- Cache invalidation strategies
- Graceful fallback when Redis is unavailable

## Configuration

Add the following Redis configuration to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=cellerhut:
REDIS_TTL_DEFAULT=3600
REDIS_ENABLE_OFFLINE_QUEUE=true
REDIS_CONNECT_TIMEOUT=10000
REDIS_MAX_RETRIES=3
```

## Features

### 1. Cache Service (Singleton)

The main cache service provides core caching operations:

```typescript
import { cacheService } from '@services/cache';

// Set a value
await cacheService.set('key', { data: 'value' }, { ttl: 3600 });

// Get a value
const value = await cacheService.get<MyType>('key');

// Delete a value
await cacheService.delete('key');

// Check existence
const exists = await cacheService.exists('key');

// Set expiration
await cacheService.expire('key', 3600);

// Get TTL
const ttl = await cacheService.ttl('key');

// Increment/Decrement
await cacheService.increment('counter', 1);
await cacheService.decrement('counter', 1);

// Batch operations
await cacheService.mset({ key1: 'value1', key2: 'value2' }, { ttl: 3600 });
const values = await cacheService.mget(['key1', 'key2']);
```

### 2. Decorators for Automatic Caching

#### @Cacheable - Cache method results

```typescript
import { Cacheable } from '@services/cache';

class UserService {
  @Cacheable({
    ttl: 3600,
    key: (userId: string) => `user:${userId}`,
  })
  async getUser(userId: string) {
    // This result will be cached
    return await db.users.findById(userId);
  }
}
```

#### @CacheEvict - Clear cache on method execution

```typescript
import { CacheEvict } from '@services/cache';

class UserService {
  @CacheEvict({
    key: (userId: string) => `user:${userId}`,
  })
  async deleteUser(userId: string) {
    // Cache will be cleared after this method executes
    return await db.users.delete(userId);
  }
}
```

#### @CachePut - Update cache with method result

```typescript
import { CachePut } from '@services/cache';

class UserService {
  @CachePut({
    ttl: 3600,
    key: (userId: string) => `user:${userId}`,
  })
  async updateUser(userId: string, data: any) {
    // Result will be cached after execution
    return await db.users.update(userId, data);
  }
}
```

### 3. HTTP Response Caching Middleware

Cache HTTP responses for better performance:

```typescript
import { cacheMiddleware, routeCache } from '@middlewares/cache.middleware';

// Global caching for all GET requests
app.use(cacheMiddleware({
  ttl: 300, // 5 minutes
  excludePaths: ['/api/auth/*', '/api/admin/*'],
}));

// Route-specific caching
router.get('/api/products', routeCache(3600), async (req, res) => {
  const products = await getProducts();
  res.json(products);
});

// Custom cache key
router.get('/api/search', 
  routeCache(1800, (req) => `search:${req.query.q}`),
  async (req, res) => {
    const results = await search(req.query.q);
    res.json(results);
  }
);
```

### 4. Redis-Based Rate Limiting

The service includes Redis-based rate limiting that automatically falls back to memory-based limiting if Redis is unavailable:

```typescript
import { redisRateLimit, createApiRateLimiter } from '@services/cache';

// Basic rate limiting
app.use(redisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
}));

// API rate limiting with user awareness
app.use('/api', createApiRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Higher limit for authenticated users
}));

// Custom rate limiting for sensitive endpoints
router.post('/auth/login', redisRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true, // Only count failed attempts
}), loginController);
```

### 5. Cache Key Generators

Consistent cache key generation utilities:

```typescript
import { 
  userCacheKey, 
  listCacheKey, 
  resourceCacheKey,
  searchCacheKey 
} from '@services/cache';

// User-specific cache keys
const key1 = userCacheKey('123', 'profile'); // "user:123:profile"

// List cache keys with pagination
const key2 = listCacheKey('products', 1, 20, { category: 'electronics' });

// Resource cache keys
const key3 = resourceCacheKey('product', '456'); // "product:456"

// Search cache keys
const key4 = searchCacheKey('products', 'laptop', { page: 1, limit: 10 });
```

### 6. Cache Invalidation

Smart cache invalidation strategies:

```typescript
import { CacheInvalidator } from '@services/cache';

// Invalidate all cache for a user
await CacheInvalidator.invalidateUser('123');

// Invalidate specific resource
await CacheInvalidator.invalidateResource('products');

// Invalidate with relationships
await CacheInvalidator.invalidateRelated('product', '123', ['category', 'brand']);

// Invalidate API endpoint cache
await CacheInvalidator.invalidateApiEndpoint('/api/products');
```

### 7. Advanced Features

#### Tagged Cache

```typescript
import { TaggedCache } from '@services/cache';

// Set cache with tags
await TaggedCache.setWithTags(
  'product:123',
  productData,
  ['products', 'electronics', 'featured'],
  3600
);

// Invalidate all entries with a tag
await TaggedCache.invalidateTag('featured');
```

#### Cache Warming

```typescript
import { CacheWarmer } from '@services/cache';

// Warm single cache entry
await CacheWarmer.warmFrequentData(
  () => fetchPopularProducts(),
  'products:popular',
  3600
);

// Warm multiple entries
await CacheWarmer.warmMultiple([
  { key: 'config', loader: () => getConfig(), ttl: 86400 },
  { key: 'categories', loader: () => getCategories(), ttl: 3600 },
]);
```

## Best Practices

1. **Key Naming**: Use consistent, hierarchical key naming:
   - `user:123:profile`
   - `product:456:details`
   - `list:products:page1:limit20`

2. **TTL Strategy**: Set appropriate TTL values:
   - User sessions: 24 hours
   - Product lists: 5-15 minutes
   - Static content: 1-24 hours
   - Search results: 5-30 minutes

3. **Cache Invalidation**: Invalidate cache when data changes:
   ```typescript
   // After updating a product
   await CacheInvalidator.invalidateResourceById('product', productId);
   await CacheInvalidator.invalidateResourceLists('product');
   ```

4. **Error Handling**: The service gracefully handles Redis failures:
   - Operations return `null` or `false` when Redis is unavailable
   - Application continues to function without cache
   - Errors are logged but not thrown

5. **Memory Management**: 
   - Set reasonable TTL values
   - Use cache eviction policies in Redis
   - Monitor Redis memory usage

## Monitoring

Check Redis connection status:

```typescript
const isConnected = cacheService.isRedisConnected();
```

## Testing

When testing, you can disable rate limiting by setting `NODE_ENV=test` or using the `skip` option:

```typescript
redisRateLimit({
  // ... options
  skip: (req) => process.env.NODE_ENV === 'test',
});
```

## Troubleshooting

1. **Redis Connection Issues**: Check logs for connection errors and ensure Redis is running
2. **Key Not Found**: Verify key naming and prefix configuration
3. **TTL Issues**: Remember TTL is in seconds, not milliseconds
4. **Rate Limiting Not Working**: Ensure Redis is connected; falls back to memory store otherwise