import { requestLogger } from '@middlewares/logger.middleware';
import { createMockRequest, createMockResponse, createMockNext } from '@tests/helpers/factories';
import { logger } from '@utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('@utils/logger');
jest.mock('uuid');

describe('Logger Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();

    // Mock uuid
    (uuidv4 as jest.Mock).mockReturnValue('test-request-id');

    // Mock response.on method
    mockResponse.on = jest.fn((event, callback) => {
      if (event === 'finish') {
        // Simulate immediate finish event
        callback();
      }
      return mockResponse;
    });
  });

  describe('request logging', () => {
    it('should add request ID to request object', () => {
      requestLogger(mockRequest, mockResponse, mockNext);

      expect(mockRequest.requestId).toBe('test-request-id');
      expect(mockRequest.startTime).toBeDefined();
      expect(typeof mockRequest.startTime).toBe('number');
    });

    it('should log incoming request', () => {
      mockRequest.method = 'GET';
      mockRequest.url = '/api/v1/users';

      requestLogger(mockRequest, mockResponse, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Request received', {
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/v1/users',
        ip: '127.0.0.1',
        userAgent: 'jest-test-agent',
      });
    });

    it('should call next middleware', () => {
      requestLogger(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('response logging', () => {
    it('should log successful response', () => {
      mockRequest.method = 'GET';
      mockRequest.url = '/api/v1/users';
      mockResponse.statusCode = 200;

      requestLogger(mockRequest, mockResponse, mockNext);
      
      // Trigger response logging by calling send
      mockResponse.send('test response');

      expect(logger.info).toHaveBeenCalledWith('Request completed', {
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/v1/users',
        statusCode: 200,
        responseTime: expect.stringMatching(/\d+ms/),
      });
    });

    it('should log error response', () => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/v1/auth/login';
      mockResponse.statusCode = 401;

      requestLogger(mockRequest, mockResponse, mockNext);
      
      // Trigger response logging by calling send
      mockResponse.send('Unauthorized');

      expect(logger.info).toHaveBeenCalledWith('Request completed', {
        requestId: 'test-request-id',
        method: 'POST',
        url: '/api/v1/auth/login',
        statusCode: 401,
        responseTime: expect.stringMatching(/\d+ms/),
      });
    });

    it('should calculate request duration', () => {
      mockRequest.method = 'GET';
      mockRequest.url = '/api/v1/users';
      mockResponse.statusCode = 200;

      // Mock Date.now to control timing
      const startTime = 1000;
      const endTime = 1500; // 500ms later
      let nowCallCount = 0;
      
      jest.spyOn(Date, 'now').mockImplementation(() => {
        return nowCallCount++ === 0 ? startTime : endTime;
      });

      requestLogger(mockRequest, mockResponse, mockNext);
      mockResponse.send('test');

      expect(logger.info).toHaveBeenLastCalledWith('Request completed', {
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/v1/users',
        statusCode: 200,
        responseTime: '500ms',
      });

      jest.restoreAllMocks();
    });
  });

  describe('edge cases', () => {
    it('should handle requests without URL', () => {
      mockRequest.method = 'GET';
      mockRequest.url = undefined;

      requestLogger(mockRequest, mockResponse, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Request received', {
        requestId: 'test-request-id',
        method: 'GET',
        url: undefined,
        ip: '127.0.0.1',
        userAgent: 'jest-test-agent',
      });
    });

    it('should handle requests without method', () => {
      mockRequest.method = undefined;
      mockRequest.url = '/api/v1/users';

      requestLogger(mockRequest, mockResponse, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Request received', {
        requestId: 'test-request-id',
        method: undefined,
        url: '/api/v1/users',
        ip: '127.0.0.1',
        userAgent: 'jest-test-agent',
      });
    });

    it('should handle logger errors gracefully', () => {
      // The middleware doesn't have error handling, so if logger throws, it will propagate
      // This test should verify that behavior
      (logger.info as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      expect(() => {
        requestLogger(mockRequest, mockResponse, mockNext);
      }).toThrow('Logger error');

      // Next should not be called if an error is thrown
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('request ID generation', () => {
    it('should always generate a new request ID', () => {
      requestLogger(mockRequest, mockResponse, mockNext);

      expect(mockRequest.requestId).toBe('test-request-id');
      expect(uuidv4).toHaveBeenCalled();
    });

    it('should generate unique request IDs for each request', () => {
      (uuidv4 as jest.Mock).mockReturnValueOnce('request-id-1').mockReturnValueOnce('request-id-2');
      
      const req1 = createMockRequest();
      const req2 = createMockRequest();
      
      requestLogger(req1, mockResponse, mockNext);
      requestLogger(req2, mockResponse, mockNext);
      
      expect(req1.requestId).toBe('request-id-1');
      expect(req2.requestId).toBe('request-id-2');
    });
  });
});
