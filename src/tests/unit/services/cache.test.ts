import { CacheService } from '@services/cache/CacheService';
import { config } from '@config/environment';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');
jest.mock('@utils/logger');

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedisClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (CacheService as any).instance = null;
    
    // Mock Redis client methods
    mockRedisClient = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      flushdb: jest.fn().mockResolvedValue('OK'),
      keys: jest.fn().mockResolvedValue([]),
      mget: jest.fn().mockResolvedValue([]),
      pipeline: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
      incrby: jest.fn().mockResolvedValue(1),
      decrby: jest.fn().mockResolvedValue(0),
      scan: jest.fn().mockResolvedValue(['0', []]),
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn(),
    };
    
    // Mock Redis constructor
    (Redis as any).mockImplementation(() => mockRedisClient);
    
    // Initialize cache service
    cacheService = CacheService.getInstance();
  });

  describe('get', () => {
    it('should get value from cache', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(value));

      const result = await cacheService.get(key);

      expect(mockRedisClient.get).toHaveBeenCalledWith(expect.stringContaining(key));
      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);

      const result = await cacheService.get('non-existent');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      mockRedisClient.get.mockResolvedValueOnce('invalid-json');

      const result = await cacheService.get('test-key');

      expect(result).toBe('invalid-json');
    });
  });

  describe('set', () => {
    it('should set value in cache', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      const ttl = 3600;

      const result = await cacheService.set(key, value, { ttl });

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.stringContaining(key),
        JSON.stringify(value),
        'EX',
        ttl
      );
      expect(result).toBe(true);
    });

    it('should set value without TTL', async () => {
      const key = 'test-key';
      const value = 'simple-value';

      await cacheService.set(key, value);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.stringContaining(key),
        JSON.stringify(value),
        'EX',
        config.redis.defaultTTL
      );
    });

    it('should handle set errors', async () => {
      mockRedisClient.set.mockRejectedValueOnce(new Error('Set failed'));

      const result = await cacheService.set('key', 'value');
      
      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete key from cache', async () => {
      const key = 'test-key';
      
      const result = await cacheService.delete(key);

      expect(mockRedisClient.del).toHaveBeenCalledWith(expect.stringContaining(key));
      expect(result).toBe(true);
    });

    it('should handle delete errors', async () => {
      mockRedisClient.del.mockRejectedValueOnce(new Error('Delete failed'));

      const result = await cacheService.delete('key');
      
      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should check if key exists', async () => {
      mockRedisClient.exists.mockResolvedValueOnce(1);

      const result = await cacheService.exists('test-key');

      expect(mockRedisClient.exists).toHaveBeenCalledWith(expect.stringContaining('test-key'));
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      mockRedisClient.exists.mockResolvedValueOnce(0);

      const result = await cacheService.exists('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('expire', () => {
    it('should set expiration time', async () => {
      const key = 'test-key';
      const seconds = 3600;

      const result = await cacheService.expire(key, seconds);

      expect(mockRedisClient.expire).toHaveBeenCalledWith(expect.stringContaining(key), seconds);
      expect(result).toBe(true);
    });
  });

  describe('flush', () => {
    it('should flush all cache', async () => {
      const result = await cacheService.flush();

      expect(mockRedisClient.flushdb).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('keys', () => {
    it('should get keys matching pattern', async () => {
      const pattern = 'user:*';
      const mockKeys = ['redis-prefix:user:1', 'redis-prefix:user:2', 'redis-prefix:user:3'];
      
      mockRedisClient.scan.mockImplementation((cursor: string) => {
        if (cursor === '0') {
          return Promise.resolve(['0', mockKeys]);
        }
        return Promise.resolve(['0', []]);
      });

      const result = await cacheService.keys(pattern);

      expect(result).toEqual(['user:1', 'user:2', 'user:3']);
    });
  });

  describe('mget', () => {
    it('should get multiple values', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = [
        JSON.stringify({ data: 'value1' }),
        JSON.stringify({ data: 'value2' }),
        null,
      ];
      mockRedisClient.mget.mockResolvedValueOnce(values);

      const result = await cacheService.mget(keys);

      expect(mockRedisClient.mget).toHaveBeenCalledWith(
        expect.stringContaining('key1'),
        expect.stringContaining('key2'),
        expect.stringContaining('key3')
      );
      expect(result).toEqual([
        { data: 'value1' },
        { data: 'value2' },
        null,
      ]);
    });
  });

  describe('mset', () => {
    it('should set multiple values', async () => {
      const keyValuePairs = {
        key1: { data: 'value1' },
        key2: { data: 'value2' },
        key3: 'simple-value',
      };

      mockRedisClient.exec.mockResolvedValueOnce([['OK'], ['OK'], ['OK']]);

      const result = await cacheService.mset(keyValuePairs);

      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('increment', () => {
    it('should increment counter', async () => {
      const key = 'counter';
      mockRedisClient.incrby.mockResolvedValueOnce(5);

      const result = await cacheService.increment(key);

      expect(mockRedisClient.incrby).toHaveBeenCalledWith(expect.stringContaining(key), 1);
      expect(result).toBe(5);
    });
  });

  describe('decrement', () => {
    it('should decrement counter', async () => {
      const key = 'counter';
      mockRedisClient.decrby.mockResolvedValueOnce(3);

      const result = await cacheService.decrement(key);

      expect(mockRedisClient.decrby).toHaveBeenCalledWith(expect.stringContaining(key), 1);
      expect(result).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should handle connection errors gracefully', async () => {
      // Simulate disconnected state
      mockRedisClient.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          callback(new Error('Connection refused'));
        }
      });

      const result = await cacheService.get('key');
      expect(result).toBeNull();
    });
  });
});