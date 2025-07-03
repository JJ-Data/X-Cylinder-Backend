// Mock dependencies first
jest.mock('@services/cache/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
  }
}));
jest.mock('@utils/logger');

import { cacheMiddleware } from '@middlewares/cache.middleware';
import { createMockRequest, createMockResponse, createMockNext } from '@tests/helpers/factories';
import { cacheService } from '@services/cache/CacheService';

describe('Cache Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: any;
  let cache: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    
    // Add required request properties
    mockRequest.path = '/api/v1/users';
    mockRequest.method = 'GET';
    mockRequest.query = {};
  });

  describe('cache key generation', () => {
    it('should generate cache key from path and query', async () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/users';
      mockRequest.query = { page: '1', limit: '10' };

      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);

      cache = cacheMiddleware();
      await cache(mockRequest, mockResponse, mockNext);

      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/users'),
        expect.objectContaining({ prefix: 'http' })
      );
    });

    it('should use custom key function if provided', async () => {
      const customKeyFn = jest.fn().mockReturnValue('custom-key');
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/users';
      mockRequest.query = {};

      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);

      cache = cacheMiddleware({ keyGenerator: customKeyFn });
      await cache(mockRequest, mockResponse, mockNext);

      expect(customKeyFn).toHaveBeenCalledWith(mockRequest);
      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('custom-key'),
        expect.objectContaining({ prefix: 'http' })
      );
    });
  });

  describe('cache hit', () => {
    it('should return cached response on cache hit', async () => {
      const cachedData = {
        statusCode: 200,
        body: { success: true, data: { users: [] } },
        headers: {},
        cachedAt: Date.now()
      };
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/users';
      mockRequest.query = {};

      (cacheService.get as jest.Mock).mockResolvedValueOnce(cachedData);

      cache = cacheMiddleware();
      await cache(mockRequest, mockResponse, mockNext);

      expect(mockResponse.set).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(cachedData.body);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set cache headers on cache hit', async () => {
      const cachedData = {
        statusCode: 200,
        body: { data: 'test' },
        headers: { 'content-type': 'application/json' },
        cachedAt: Date.now()
      };
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/data';
      mockRequest.query = {};

      (cacheService.get as jest.Mock).mockResolvedValueOnce(cachedData);

      cache = cacheMiddleware();
      await cache(mockRequest, mockResponse, mockNext);

      expect(mockResponse.set).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(mockResponse.set).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('max-age=300'));
      expect(mockResponse.set).toHaveBeenCalledWith('content-type', 'application/json');
    });
  });

  describe('cache miss', () => {
    it('should call next middleware on cache miss', async () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/users';
      mockRequest.query = {};

      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);

      cache = cacheMiddleware();
      await cache(mockRequest, mockResponse, mockNext);

      expect(mockResponse.set).toHaveBeenCalledWith('X-Cache', 'MISS');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should cache response after successful request', async () => {
      const responseData = { success: true, data: { users: [] } };
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/users';
      mockRequest.query = {};

      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);
      (cacheService.set as jest.Mock).mockResolvedValueOnce(true);

      cache = cacheMiddleware({ ttl: 600 });
      await cache(mockRequest, mockResponse, mockNext);

      // The middleware overrides json method, call it to trigger caching
      mockResponse.statusCode = 200;
      mockResponse.getHeaders = jest.fn().mockReturnValue({});
      
      // Get the overridden json method and call it
      const jsonMethod = mockResponse.json;
      await jsonMethod.call(mockResponse, responseData);

      // Wait for async operations to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          statusCode: 200,
          body: responseData,
          headers: expect.any(Object),
          cachedAt: expect.any(Number)
        }),
        expect.objectContaining({ ttl: 600, prefix: 'http' })
      );
    });

    it('should not cache non-successful responses', async () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/users';
      mockRequest.query = {};

      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);

      cache = cacheMiddleware();
      await cache(mockRequest, mockResponse, mockNext);

      // Simulate error response
      mockResponse.statusCode = 404;
      mockResponse.getHeaders = jest.fn().mockReturnValue({});
      const jsonMethod = mockResponse.json;
      await jsonMethod.call(mockResponse, { error: 'Not found' });

      // Wait for async operations to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('HTTP methods', () => {
    it('should only cache GET requests by default', async () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/users';
      mockRequest.query = {};

      cache = cacheMiddleware();
      await cache(mockRequest, mockResponse, mockNext);

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not cache non-GET requests', async () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/users';

      cache = cacheMiddleware();
      await cache(mockRequest, mockResponse, mockNext);

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('cache options', () => {
    it('should use default TTL of 5 minutes', async () => {
      const responseData = { data: 'test' };
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/data';
      mockRequest.query = {};

      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);
      (cacheService.set as jest.Mock).mockResolvedValueOnce(true);

      cache = cacheMiddleware();
      await cache(mockRequest, mockResponse, mockNext);

      mockResponse.statusCode = 200;
      mockResponse.getHeaders = jest.fn().mockReturnValue({});
      const jsonMethod = mockResponse.json;
      await jsonMethod.call(mockResponse, responseData);

      // Wait for async operations to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ ttl: 300 }) // 5 minutes default
      );
    });

    it('should use custom TTL when provided', async () => {
      const responseData = { data: 'test' };
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/data';
      mockRequest.query = {};

      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);
      (cacheService.set as jest.Mock).mockResolvedValueOnce(true);

      cache = cacheMiddleware({ ttl: 1800 }); // 30 minutes
      await cache(mockRequest, mockResponse, mockNext);

      mockResponse.statusCode = 200;
      mockResponse.getHeaders = jest.fn().mockReturnValue({});
      const jsonMethod = mockResponse.json;
      await jsonMethod.call(mockResponse, responseData);

      // Wait for async operations to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ ttl: 1800 })
      );
    });

    it('should use condition function when provided', async () => {
      const conditionFn = jest.fn().mockReturnValue(false);
      mockRequest.method = 'GET';

      cache = cacheMiddleware({ condition: conditionFn });
      await cache(mockRequest, mockResponse, mockNext);

      expect(conditionFn).toHaveBeenCalledWith(mockRequest);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should continue without caching on cache service error', async () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/users';
      mockRequest.query = {};

      (cacheService.get as jest.Mock).mockRejectedValueOnce(new Error('Cache error'));

      cache = cacheMiddleware();
      await cache(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.set).not.toHaveBeenCalledWith('X-Cache', expect.any(String));
    });

    it.skip('should handle cache set errors gracefully', async () => {
      const responseData = { data: 'test' };
      const originalJson = jest.fn().mockReturnValue(mockResponse);
      
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/data';
      mockRequest.query = {};
      mockResponse.json = originalJson;

      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);
      // Mock cacheService.set to reject
      (cacheService.set as jest.Mock).mockImplementation(() => Promise.reject(new Error('Cache set error')));

      cache = cacheMiddleware();
      await cache(mockRequest, mockResponse, mockNext);

      mockResponse.statusCode = 200;
      mockResponse.getHeaders = jest.fn().mockReturnValue({});
      
      // Call the overridden json method - it should work even if cache fails
      const result = mockResponse.json(responseData);
      
      // Wait a bit for the promise rejection to occur
      await new Promise(resolve => setImmediate(resolve));
      
      // Original json should have been called
      expect(originalJson).toHaveBeenCalledWith(responseData);
      
      // Should still return the response
      expect(result).toBe(mockResponse);
      
      // The cache set should have been attempted
      expect(cacheService.set).toHaveBeenCalled();
    });
  });
});