import { cacheService } from '../CacheService';
import { logger } from '../../../utils/logger';
import crypto from 'crypto';

export interface CacheableOptions {
  ttl?: number;
  prefix?: string;
  key?: string | ((...args: any[]) => string);
  condition?: (...args: any[]) => boolean;
  unless?: (result: any) => boolean;
}

/**
 * Decorator to cache method results
 * @param options - Caching options
 */
export function Cacheable(options: CacheableOptions = {}): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      try {
        // Check if caching should be applied based on condition
        if (options.condition && !options.condition(...args)) {
          return await originalMethod.apply(this, args);
        }

        // Generate cache key
        const cacheKey = generateCacheKey(
          target.constructor.name,
          propertyKey.toString(),
          args,
          options.key
        );

        // Try to get from cache
        const cachedValue = await cacheService.get(cacheKey, {
          prefix: options.prefix,
        });

        if (cachedValue !== null) {
          logger.debug(`Cache hit for key: ${cacheKey}`);
          return cachedValue;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Check if result should be cached based on unless condition
        if (options.unless && options.unless(result)) {
          return result;
        }

        // Cache the result
        await cacheService.set(cacheKey, result, {
          ttl: options.ttl,
          prefix: options.prefix,
        });

        logger.debug(`Cached result for key: ${cacheKey}`);
        return result;
      } catch (error) {
        logger.error('Error in @Cacheable decorator:', error);
        // Fallback to original method on error
        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to evict cache entries
 * @param options - Cache eviction options
 */
export function CacheEvict(options: CacheEvictOptions = {}): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      try {
        // Execute original method first
        const result = await originalMethod.apply(this, args);

        // Check if cache should be evicted based on condition
        if (options.condition && !options.condition(...args, result)) {
          return result;
        }

        // Generate cache key or pattern
        if (options.allEntries) {
          // Delete all entries with the prefix
          const pattern = `${options.prefix || target.constructor.name}:*`;
          await cacheService.deletePattern(pattern);
          logger.debug(`Evicted all cache entries with pattern: ${pattern}`);
        } else {
          // Delete specific key
          const cacheKey = generateCacheKey(
            target.constructor.name,
            propertyKey.toString(),
            args,
            options.key
          );
          await cacheService.delete(cacheKey, { prefix: options.prefix });
          logger.debug(`Evicted cache for key: ${cacheKey}`);
        }

        return result;
      } catch (error) {
        logger.error('Error in @CacheEvict decorator:', error);
        // Return original result on error
        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

export interface CacheEvictOptions {
  prefix?: string;
  key?: string | ((...args: any[]) => string);
  condition?: (...args: any[]) => boolean;
  allEntries?: boolean;
}

/**
 * Decorator to update cache entries
 * @param options - Cache update options
 */
export function CachePut(options: CachePutOptions = {}): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      try {
        // Execute original method first
        const result = await originalMethod.apply(this, args);

        // Check if cache should be updated based on condition
        if (options.condition && !options.condition(...args, result)) {
          return result;
        }

        // Check if result should be cached based on unless condition
        if (options.unless && options.unless(result)) {
          return result;
        }

        // Generate cache key
        const cacheKey = generateCacheKey(
          target.constructor.name,
          propertyKey.toString(),
          args,
          options.key
        );

        // Update cache with the result
        await cacheService.set(cacheKey, result, {
          ttl: options.ttl,
          prefix: options.prefix,
        });

        logger.debug(`Updated cache for key: ${cacheKey}`);
        return result;
      } catch (error) {
        logger.error('Error in @CachePut decorator:', error);
        // Return original result on error
        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

export interface CachePutOptions {
  ttl?: number;
  prefix?: string;
  key?: string | ((...args: any[]) => string);
  condition?: (...args: any[]) => boolean;
  unless?: (result: any) => boolean;
}

/**
 * Generate a cache key based on class name, method name, and arguments
 */
function generateCacheKey(
  className: string,
  methodName: string,
  args: any[],
  customKey?: string | ((...args: any[]) => string)
): string {
  if (customKey) {
    if (typeof customKey === 'function') {
      return customKey(...args);
    }
    return customKey;
  }

  // Default key generation
  const baseKey = `${className}:${methodName}`;

  if (args.length === 0) {
    return baseKey;
  }

  // Create a hash of the arguments for complex objects
  const argsHash = crypto
    .createHash('md5')
    .update(JSON.stringify(args))
    .digest('hex')
    .substring(0, 8);

  return `${baseKey}:${argsHash}`;
}

/**
 * Clear all cache entries for a specific class
 */
export async function clearClassCache(className: string): Promise<void> {
  const pattern = `${className}:*`;
  await cacheService.deletePattern(pattern);
  logger.info(`Cleared all cache entries for class: ${className}`);
}

/**
 * Clear cache for a specific method
 */
export async function clearMethodCache(className: string, methodName: string): Promise<void> {
  const pattern = `${className}:${methodName}:*`;
  await cacheService.deletePattern(pattern);
  logger.info(`Cleared cache entries for method: ${className}.${methodName}`);
}
