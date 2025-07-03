import request from 'supertest';
import { createApp } from '@/app';
import { Application } from 'express';
import { User } from '@models/User.model';
import { fileUploadService } from '@services/storage';
import { generateJWT } from '@utils/helpers';
import { createMockUser, createMockUploadResult } from '../helpers/factories';
import path from 'path';

// Mock the file upload service
jest.mock('@services/storage');

describe('Upload Routes Integration Tests', () => {
  let app: Application;
  let authToken: string;
  let mockUser: any;

  beforeAll(async () => {
    app = createApp();
    mockUser = createMockUser({ id: 'user-123' });
    authToken = generateJWT({ id: mockUser.id, email: mockUser.email });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fileUploadService methods
    (fileUploadService.uploadFile as jest.Mock).mockResolvedValue(createMockUploadResult());
    (fileUploadService.deleteFile as jest.Mock).mockResolvedValue(undefined);
    (fileUploadService.listFiles as jest.Mock).mockResolvedValue({
      files: [
        {
          key: 'users/user-123/file1.jpg',
          size: 1024,
          lastModified: new Date(),
          url: 'https://example.com/file1.jpg',
        },
        {
          key: 'users/user-123/file2.pdf',
          size: 2048,
          lastModified: new Date(),
          url: 'https://example.com/file2.pdf',
        },
      ],
      nextContinuationToken: null,
    });
  });

  describe('POST /api/v1/upload/single', () => {
    it('should upload a single file successfully', async () => {
      const response = await request(app)
        .post('/api/v1/upload/single')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test file content'), 'test.jpg')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'File uploaded successfully',
        data: expect.objectContaining({
          key: expect.any(String),
          url: expect.any(String),
        }),
      });

      expect(fileUploadService.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'test.jpg',
        expect.objectContaining({
          folder: `users/${mockUser.id}`,
        })
      );
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/upload/single')
        .attach('file', Buffer.from('test file content'), 'test.jpg')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('No token provided'),
      });
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app)
        .post('/api/v1/upload/single')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'No file uploaded',
      });
    });

    it('should handle file type validation errors', async () => {
      const response = await request(app)
        .post('/api/v1/upload/single')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test file content'), 'test.exe')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('File type'),
      });
    });
  });

  describe('POST /api/v1/upload/multiple', () => {
    it('should upload multiple files successfully', async () => {
      const response = await request(app)
        .post('/api/v1/upload/multiple')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', Buffer.from('file 1'), 'file1.jpg')
        .attach('files', Buffer.from('file 2'), 'file2.jpg')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Files uploaded successfully',
        data: expect.arrayContaining([
          expect.objectContaining({
            key: expect.any(String),
            url: expect.any(String),
          }),
        ]),
      });

      expect(fileUploadService.uploadFile).toHaveBeenCalledTimes(2);
    });

    it('should enforce maximum file limit', async () => {
      const response = await request(app)
        .post('/api/v1/upload/multiple')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', Buffer.from('file 1'), 'file1.jpg')
        .attach('files', Buffer.from('file 2'), 'file2.jpg')
        .attach('files', Buffer.from('file 3'), 'file3.jpg')
        .attach('files', Buffer.from('file 4'), 'file4.jpg')
        .attach('files', Buffer.from('file 5'), 'file5.jpg')
        .attach('files', Buffer.from('file 6'), 'file6.jpg')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Too many files'),
      });
    });
  });

  describe('POST /api/v1/upload/avatar', () => {
    it('should upload avatar successfully', async () => {
      const response = await request(app)
        .post('/api/v1/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', Buffer.from('avatar image'), 'avatar.jpg')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Avatar uploaded successfully',
      });

      expect(fileUploadService.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'avatar.jpg',
        expect.objectContaining({
          folder: `avatars/${mockUser.id}`,
          imageProcessing: expect.objectContaining({
            resize: expect.any(Object),
            format: 'webp',
          }),
        })
      );
    });

    it('should reject non-image files for avatar', async () => {
      const response = await request(app)
        .post('/api/v1/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', Buffer.from('document content'), 'document.pdf')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('File type'),
      });
    });
  });

  describe('DELETE /api/v1/upload', () => {
    it('should delete user file successfully', async () => {
      const fileKey = `users/${mockUser.id}/test-file.jpg`;
      
      const response = await request(app)
        .delete('/api/v1/upload')
        .query({ key: fileKey })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'File deleted successfully',
      });

      expect(fileUploadService.deleteFile).toHaveBeenCalledWith(fileKey);
    });

    it('should prevent deleting files from other users', async () => {
      const fileKey = 'users/other-user-id/test-file.jpg';
      
      const response = await request(app)
        .delete('/api/v1/upload')
        .query({ key: fileKey })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Unauthorized to delete this file',
      });

      expect(fileUploadService.deleteFile).not.toHaveBeenCalled();
    });

    it('should return 400 when key is missing', async () => {
      const response = await request(app)
        .delete('/api/v1/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'File key is required',
      });
    });
  });

  describe('GET /api/v1/upload/list', () => {
    it('should list user files successfully', async () => {
      const response = await request(app)
        .get('/api/v1/upload/list')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Files retrieved successfully',
        data: expect.objectContaining({
          files: expect.arrayContaining([
            expect.objectContaining({
              key: expect.stringContaining(`users/${mockUser.id}`),
              url: expect.any(String),
            }),
          ]),
        }),
      });

      expect(fileUploadService.listFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          prefix: `users/${mockUser.id}/`,
        })
      );
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/upload/list')
        .query({
          maxKeys: '50',
          continuationToken: 'next-page-token',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(fileUploadService.listFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          maxKeys: 50,
          continuationToken: 'next-page-token',
        })
      );
    });

    it('should filter by prefix', async () => {
      const response = await request(app)
        .get('/api/v1/upload/list')
        .query({ prefix: 'documents' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(fileUploadService.listFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          prefix: `users/${mockUser.id}/documents`,
        })
      );
    });
  });
});