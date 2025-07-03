import { UserAttributes } from '@app-types/user.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Factory functions for creating test data
 */

export const createMockUser = (overrides: Partial<UserAttributes> = {}) => ({
  id: uuidv4(),
  email: 'test@example.com',
  password: 'hashedPassword123',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockFile = (overrides: any = {}) => ({
  fieldname: 'file',
  originalname: 'test-file.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: 1024 * 100, // 100KB
  buffer: Buffer.from('fake-file-content'),
  ...overrides,
});

export const createMockRequest = (overrides: any = {}) => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  user: null,
  ip: '127.0.0.1',
  socket: {
    remoteAddress: '127.0.0.1',
  },
  get: jest.fn((header: string) => {
    if (header.toLowerCase() === 'user-agent') {
      return 'jest-test-agent';
    }
    return overrides.headers?.[header];
  }),
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.get = jest.fn().mockReturnValue(res);
  res.getHeaders = jest.fn().mockReturnValue({});
  res.statusCode = 200;
  res.on = jest.fn().mockReturnValue(res);
  return res;
};

export const createMockNext = () => jest.fn();

export const createMockEmailData = (overrides: any = {}) => ({
  to: 'recipient@example.com',
  subject: 'Test Email',
  html: '<p>Test email content</p>',
  text: 'Test email content',
  ...overrides,
});

export const createMockUploadResult = (overrides: any = {}) => ({
  key: 'users/123/test-file.jpg',
  url: 'https://storage.example.com/users/123/test-file.jpg',
  size: 1024 * 100,
  mimeType: 'image/jpeg',
  etag: 'abc123',
  ...overrides,
});