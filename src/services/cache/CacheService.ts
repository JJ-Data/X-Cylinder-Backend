import Redis, { RedisOptions } from 'ioredis';
import { config } from '../../config/environment';
import { logger } from '../../utils/logger';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export class CacheService {
  private static instance: CacheService;
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private readonly defaultTTL: number;
  private readonly keyPrefix: string;

  private constructor() {
    this.defaultTTL = config.redis.defaultTTL;
    this.keyPrefix = config.redis.keyPrefix;
    this.initializeRedis();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private async initializeRedis(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  private async connect(): Promise<void> {
    try {
      const redisOptions: RedisOptions = {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.db,
        keyPrefix: this.keyPrefix,
        enableOfflineQueue: config.redis.enableOfflineQueue,
        connectTimeout: config.redis.connectTimeout,
        maxRetriesPerRequest: config.redis.maxRetries,
        retryStrategy: (times: number) => {
          if (times > config.redis.maxRetries) {
            logger.error('Redis: Maximum retry attempts reached');
            return null;
          }
          const delay = Math.min(times * 1000, 3000);
          logger.warn(`Redis: Retrying connection in ${delay}ms (attempt ${times})`);
          return delay;
        },
        lazyConnect: true,
      };

      this.client = new Redis(redisOptions);

      // Set up event handlers
      this.client.on('connect', () => {
        logger.info('Redis: Connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        logger.warn('Redis: Connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis: Attempting to reconnect...');
      });

      // Connect to Redis
      await this.client.connect();

      // Test the connection
      await this.client.ping();
    } catch (error) {
      logger.error('Redis: Failed to connect', error);
      this.isConnected = false;
      this.client = null;
      // Don't throw error to allow graceful degradation
    }
  }

  /**
   * Ensure Redis client is available
   */
  private ensureClient(): Redis | null {
    if (!this.client || !this.isConnected) {
      logger.warn('Redis: Client not available, operation will be skipped');
      return null;
    }
    return this.client;
  }

  /**
   * Generate a cache key with optional custom prefix
   */
  private generateKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || '';
    // Remove the default keyPrefix as it's already added by ioredis
    return finalPrefix ? `${finalPrefix}:${key}` : key;
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string, options?: CacheOptions): Promise<T | null> {
    const client = this.ensureClient();
    if (!client) return null;

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const value = await client.get(fullKey);

      if (!value) return null;

      // Try to parse as JSON, otherwise return as string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      logger.error(`Redis: Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: any, options?: CacheOptions): Promise<boolean> {
    const client = this.ensureClient();
    if (!client) return false;

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const ttl = options?.ttl ?? this.defaultTTL;
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl > 0) {
        await client.setex(fullKey, ttl, serializedValue);
      } else {
        await client.set(fullKey, serializedValue);
      }

      return true;
    } catch (error) {
      logger.error(`Redis: Error setting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    const client = this.ensureClient();
    if (!client) return false;

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const result = await client.del(fullKey);
      return result > 0;
    } catch (error) {
      logger.error(`Redis: Error deleting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string, options?: CacheOptions): Promise<number> {
    const client = this.ensureClient();
    if (!client) return 0;

    try {
      const fullPattern = this.generateKey(pattern, options?.prefix);
      const keys = await client.keys(fullPattern);

      if (keys.length === 0) return 0;

      // Remove the keyPrefix from keys before deleting (ioredis adds it automatically)
      const keysWithoutPrefix = keys.map((k) => k.replace(new RegExp(`^${this.keyPrefix}`), ''));
      const result = await client.del(...keysWithoutPrefix);
      return result;
    } catch (error) {
      logger.error(`Redis: Error deleting pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    const client = this.ensureClient();
    if (!client) return false;

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const result = await client.exists(fullKey);
      return result > 0;
    } catch (error) {
      logger.error(`Redis: Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, seconds: number, options?: CacheOptions): Promise<boolean> {
    const client = this.ensureClient();
    if (!client) return false;

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const result = await client.expire(fullKey, seconds);
      return result === 1;
    } catch (error) {
      logger.error(`Redis: Error setting expiration for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string, options?: CacheOptions): Promise<number> {
    const client = this.ensureClient();
    if (!client) return -2; // Key does not exist

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      return await client.ttl(fullKey);
    } catch (error) {
      logger.error(`Redis: Error getting TTL for key ${key}:`, error);
      return -2;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async flush(): Promise<boolean> {
    const client = this.ensureClient();
    if (!client) return false;

    try {
      await client.flushdb();
      logger.info('Redis: Cache flushed');
      return true;
    } catch (error) {
      logger.error('Redis: Error flushing cache:', error);
      return false;
    }
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, value: number = 1, options?: CacheOptions): Promise<number | null> {
    const client = this.ensureClient();
    if (!client) return null;

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const result = await client.incrby(fullKey, value);

      // Set TTL if provided and key was just created
      if (options?.ttl && result === value) {
        await client.expire(fullKey, options.ttl);
      }

      return result;
    } catch (error) {
      logger.error(`Redis: Error incrementing key ${key}:`, error);
      return null;
    }
  }

  /**
   * Decrement a numeric value
   */
  async decrement(key: string, value: number = 1, options?: CacheOptions): Promise<number | null> {
    const client = this.ensureClient();
    if (!client) return null;

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const result = await client.decrby(fullKey, value);

      // Set TTL if provided and key was just created
      if (options?.ttl && result === -value) {
        await client.expire(fullKey, options.ttl);
      }

      return result;
    } catch (error) {
      logger.error(`Redis: Error decrementing key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get multiple values at once
   */
  async mget<T = any>(keys: string[], options?: CacheOptions): Promise<(T | null)[]> {
    const client = this.ensureClient();
    if (!client) return keys.map(() => null);

    try {
      const fullKeys = keys.map((key) => this.generateKey(key, options?.prefix));
      const values = await client.mget(...fullKeys);

      return values.map((value) => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      });
    } catch (error) {
      logger.error('Redis: Error getting multiple keys:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values at once
   */
  async mset(data: Record<string, any>, options?: CacheOptions): Promise<boolean> {
    const client = this.ensureClient();
    if (!client) return false;

    try {
      const pipeline = client.pipeline();
      const ttl = options?.ttl ?? this.defaultTTL;

      for (const [key, value] of Object.entries(data)) {
        const fullKey = this.generateKey(key, options?.prefix);
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

        if (ttl > 0) {
          pipeline.setex(fullKey, ttl, serializedValue);
        } else {
          pipeline.set(fullKey, serializedValue);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Redis: Error setting multiple keys:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis: Disconnected');
    }
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();
