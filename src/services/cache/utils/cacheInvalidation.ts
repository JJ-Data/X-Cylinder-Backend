import { cacheService } from '../CacheService';
import { cachePatterns } from './cacheKeyGenerators';
import { logger } from '../../../utils/logger';

/**
 * Cache invalidation strategies
 */
export class CacheInvalidator {
  /**
   * Invalidate all cache entries for a user
   */
  static async invalidateUser(userId: string): Promise<void> {
    const pattern = cachePatterns.userAll(userId);
    const deleted = await cacheService.deletePattern(pattern);
    logger.info(`Invalidated ${deleted} cache entries for user ${userId}`);
  }

  /**
   * Invalidate specific user resource cache
   */
  static async invalidateUserResource(userId: string, resource: string): Promise<void> {
    const pattern = cachePatterns.userResource(userId, resource);
    const deleted = await cacheService.deletePattern(pattern);
    logger.info(`Invalidated ${deleted} cache entries for user ${userId} resource ${resource}`);
  }

  /**
   * Invalidate all cache entries for a resource type
   */
  static async invalidateResource(resource: string): Promise<void> {
    const patterns = [
      cachePatterns.resourceAll(resource),
      cachePatterns.resourceLists(resource),
      cachePatterns.resourceSearch(resource),
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await cacheService.deletePattern(pattern);
    }

    logger.info(`Invalidated ${totalDeleted} cache entries for resource ${resource}`);
  }

  /**
   * Invalidate specific resource by ID
   */
  static async invalidateResourceById(resource: string, id: string | number): Promise<void> {
    const key = `${resource}:${id}`;
    await cacheService.delete(key);

    // Also invalidate lists and searches as they might contain this resource
    await this.invalidateResourceLists(resource);
  }

  /**
   * Invalidate all list caches for a resource
   */
  static async invalidateResourceLists(resource: string): Promise<void> {
    const pattern = cachePatterns.resourceLists(resource);
    const deleted = await cacheService.deletePattern(pattern);
    logger.info(`Invalidated ${deleted} list cache entries for resource ${resource}`);
  }

  /**
   * Invalidate search caches for a resource
   */
  static async invalidateResourceSearch(resource: string): Promise<void> {
    const pattern = cachePatterns.resourceSearch(resource);
    const deleted = await cacheService.deletePattern(pattern);
    logger.info(`Invalidated ${deleted} search cache entries for resource ${resource}`);
  }

  /**
   * Invalidate API endpoint cache
   */
  static async invalidateApiEndpoint(path: string): Promise<void> {
    const pattern = cachePatterns.apiEndpoint(path);
    const deleted = await cacheService.deletePattern(pattern);
    logger.info(`Invalidated ${deleted} cache entries for API endpoint ${path}`);
  }

  /**
   * Invalidate all API cache for a user
   */
  static async invalidateApiUser(userId: string): Promise<void> {
    const pattern = cachePatterns.apiUser(userId);
    const deleted = await cacheService.deletePattern(pattern);
    logger.info(`Invalidated ${deleted} API cache entries for user ${userId}`);
  }

  /**
   * Invalidate session cache
   */
  static async invalidateSession(sessionId: string): Promise<void> {
    const pattern = cachePatterns.sessionAll(sessionId);
    const deleted = await cacheService.deletePattern(pattern);
    logger.info(`Invalidated ${deleted} cache entries for session ${sessionId}`);
  }

  /**
   * Invalidate temporary data by type
   */
  static async invalidateTempData(type: string, identifier?: string): Promise<void> {
    if (identifier) {
      const key = `temp:${type}:${identifier}`;
      await cacheService.delete(key);
    } else {
      const pattern = cachePatterns.tempDataType(type);
      const deleted = await cacheService.deletePattern(pattern);
      logger.info(`Invalidated ${deleted} temporary data entries of type ${type}`);
    }
  }

  /**
   * Invalidate multiple patterns at once
   */
  static async invalidatePatterns(patterns: string[]): Promise<void> {
    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await cacheService.deletePattern(pattern);
    }
    logger.info(`Invalidated ${totalDeleted} cache entries across ${patterns.length} patterns`);
  }

  /**
   * Smart invalidation based on entity relationships
   */
  static async invalidateRelated(
    entity: string,
    entityId: string | number,
    relatedEntities: string[]
  ): Promise<void> {
    // Invalidate the main entity
    await this.invalidateResourceById(entity, entityId);

    // Invalidate related entities
    for (const related of relatedEntities) {
      await this.invalidateResourceLists(related);
      await this.invalidateResourceSearch(related);
    }
  }
}

/**
 * Cache warming strategies
 */
export class CacheWarmer {
  /**
   * Warm cache with frequently accessed data
   */
  static async warmFrequentData(
    dataLoader: () => Promise<any>,
    cacheKey: string,
    ttl?: number
  ): Promise<void> {
    try {
      const data = await dataLoader();
      await cacheService.set(cacheKey, data, { ttl });
      logger.info(`Warmed cache for key: ${cacheKey}`);
    } catch (error) {
      logger.error(`Failed to warm cache for key ${cacheKey}:`, error);
    }
  }

  /**
   * Warm multiple cache entries in parallel
   */
  static async warmMultiple(
    entries: Array<{
      key: string;
      loader: () => Promise<any>;
      ttl?: number;
    }>
  ): Promise<void> {
    const warmingPromises = entries.map(({ key, loader, ttl }) =>
      this.warmFrequentData(loader, key, ttl)
    );

    await Promise.allSettled(warmingPromises);
    logger.info(`Attempted to warm ${entries.length} cache entries`);
  }
}

/**
 * Cache tag-based invalidation
 */
export class TaggedCache {
  private static readonly TAG_PREFIX = 'tag:';

  /**
   * Set cache with tags
   */
  static async setWithTags(key: string, value: any, tags: string[], ttl?: number): Promise<void> {
    // Set the actual cache value
    await cacheService.set(key, value, { ttl });

    // Store key under each tag
    for (const tag of tags) {
      const tagKey = `${this.TAG_PREFIX}${tag}`;
      const taggedKeys = (await cacheService.get<string[]>(tagKey)) || [];

      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        await cacheService.set(tagKey, taggedKeys, { ttl: 86400 }); // 24 hours
      }
    }
  }

  /**
   * Invalidate all cache entries with a specific tag
   */
  static async invalidateTag(tag: string): Promise<void> {
    const tagKey = `${this.TAG_PREFIX}${tag}`;
    const taggedKeys = (await cacheService.get<string[]>(tagKey)) || [];

    // Delete all keys associated with this tag
    for (const key of taggedKeys) {
      await cacheService.delete(key);
    }

    // Delete the tag key itself
    await cacheService.delete(tagKey);

    logger.info(`Invalidated ${taggedKeys.length} cache entries with tag: ${tag}`);
  }

  /**
   * Invalidate multiple tags at once
   */
  static async invalidateTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.invalidateTag(tag);
    }
  }
}

/**
 * Cache dependency tracking
 */
export class CacheDependency {
  private static readonly DEPENDENCY_PREFIX = 'dep:';

  /**
   * Set cache with dependencies
   */
  static async setWithDependencies(
    key: string,
    value: any,
    dependencies: string[],
    ttl?: number
  ): Promise<void> {
    // Set the actual cache value
    await cacheService.set(key, value, { ttl });

    // Track dependencies
    for (const dep of dependencies) {
      const depKey = `${this.DEPENDENCY_PREFIX}${dep}`;
      const dependentKeys = (await cacheService.get<string[]>(depKey)) || [];

      if (!dependentKeys.includes(key)) {
        dependentKeys.push(key);
        await cacheService.set(depKey, dependentKeys, { ttl: 86400 }); // 24 hours
      }
    }
  }

  /**
   * Invalidate all cache entries dependent on a specific key
   */
  static async invalidateDependents(dependencyKey: string): Promise<void> {
    const depKey = `${this.DEPENDENCY_PREFIX}${dependencyKey}`;
    const dependentKeys = (await cacheService.get<string[]>(depKey)) || [];

    // Delete all dependent keys
    for (const key of dependentKeys) {
      await cacheService.delete(key);
    }

    // Delete the dependency tracking key
    await cacheService.delete(depKey);

    logger.info(`Invalidated ${dependentKeys.length} cache entries dependent on: ${dependencyKey}`);
  }
}
