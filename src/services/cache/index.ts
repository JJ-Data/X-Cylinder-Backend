// Export main cache service
export { CacheService, cacheService, CacheOptions } from './CacheService';

// Export decorators
export {
  Cacheable,
  CacheEvict,
  CachePut,
  CacheableOptions,
  CacheEvictOptions,
  CachePutOptions,
  clearClassCache,
  clearMethodCache,
} from './decorators/Cacheable.decorator';

// Export cache key generators
export {
  userCacheKey,
  listCacheKey,
  resourceCacheKey,
  apiCacheKey,
  searchCacheKey,
  aggregateCacheKey,
  sessionCacheKey,
  tempDataCacheKey,
  cachePatterns,
  versionedCacheKey,
  namespacedCacheKey,
  roleCacheKey,
  permissionCacheKey,
  rateLimitKey,
  lockKey,
} from './utils/cacheKeyGenerators';

// Export cache invalidation utilities
export {
  CacheInvalidator,
  CacheWarmer,
  TaggedCache,
  CacheDependency,
} from './utils/cacheInvalidation';

// Export rate limiting utilities
export {
  redisRateLimit,
  slidingWindowRateLimit,
  DistributedRateLimiter,
  TokenBucketRateLimiter,
  createRouteRateLimiter,
  createApiRateLimiter,
  RateLimitOptions,
} from './utils/rateLimiter';