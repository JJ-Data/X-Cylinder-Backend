import { FileUploadService } from '@services/storage/FileUploadService';
import { LocalStorageProvider } from '@services/storage/providers/LocalStorageProvider';
import { S3Provider } from '@services/storage/providers/S3Provider';
import { createMockFile, createMockUploadResult } from '@tests/helpers/factories';
import { config } from '@config/environment';
import * as fileType from 'file-type';

// Mock providers
jest.mock('@services/storage/providers/LocalStorageProvider');
jest.mock('@services/storage/providers/S3Provider');
jest.mock('@utils/logger');
jest.mock('file-type');

describe('FileUploadService', () => {
  let fileUploadService: FileUploadService;
  let mockProvider: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock provider methods
    mockProvider = {
      upload: jest.fn().mockResolvedValue(createMockUploadResult()),
      delete: jest.fn().mockResolvedValue(undefined),
      getUrl: jest.fn().mockReturnValue('https://example.com/file.jpg'),
      exists: jest.fn().mockResolvedValue(true),
      getStream: jest.fn().mockReturnValue(Buffer.from('file-content')),
      list: jest.fn().mockResolvedValue({
        files: [],
        nextContinuationToken: null,
      }),
    };

    // Mock provider constructors
    (LocalStorageProvider as any).mockImplementation(() => mockProvider);
    (S3Provider as any).mockImplementation(() => mockProvider);

    // Mock file-type
    (fileType.fileTypeFromBuffer as jest.Mock).mockResolvedValue({
      mime: 'image/jpeg',
      ext: 'jpg',
    });
  });

  describe('initialization', () => {
    it('should initialize with local provider by default', () => {
      config.storage.provider = 'local';
      fileUploadService = FileUploadService.getInstance();
      expect(LocalStorageProvider).toHaveBeenCalled();
    });

    it('should initialize with S3 provider', () => {
      config.storage.provider = 's3';
      fileUploadService = FileUploadService.getInstance();
      expect(S3Provider).toHaveBeenCalled();
    });

    it('should initialize with Spaces provider', () => {
      config.storage.provider = 'spaces';
      fileUploadService = FileUploadService.getInstance();
      expect(S3Provider).toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    beforeEach(() => {
      config.storage.provider = 'local';
      fileUploadService = FileUploadService.getInstance();
    });

    it('should upload file successfully', async () => {
      const buffer = Buffer.from('test-file-content');
      const filename = 'test.jpg';
      const options = { folder: 'uploads' };

      const result = await fileUploadService.uploadFile(buffer, filename, options);

      expect(mockProvider.upload).toHaveBeenCalled();
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('url');
    });

    it('should generate unique filename when requested', async () => {
      const buffer = Buffer.from('test-file-content');
      const filename = 'test.jpg';
      const options = { generateUniqueName: true };

      await fileUploadService.uploadFile(buffer, filename, options);

      expect(mockProvider.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.stringMatching(/test-[\w-]+\.jpg$/),
        })
      );
    });

    it('should validate file content when requested', async () => {
      const buffer = Buffer.from('test-file-content');
      const filename = 'test.jpg';
      const options = { validation: { validateContent: true } };

      await fileUploadService.uploadFile(buffer, filename, options);

      expect(fileType.fileTypeFromBuffer).toHaveBeenCalledWith(buffer);
    });

    it('should reject invalid file types', async () => {
      (fileType.fileTypeFromBuffer as jest.Mock).mockResolvedValueOnce({
        mime: 'application/x-msdownload',
        ext: 'exe',
      });

      const buffer = Buffer.from('test-file-content');
      const filename = 'test.exe';
      const options = {
        validation: {
          validateContent: true,
          allowedMimeTypes: ['image/jpeg', 'image/png'],
        },
      };

      await expect(fileUploadService.uploadFile(buffer, filename, options)).rejects.toThrow(
        'Invalid file type'
      );
    });

    it('should handle upload errors', async () => {
      mockProvider.upload.mockRejectedValueOnce(new Error('Upload failed'));
      const buffer = Buffer.from('test-file-content');
      const filename = 'test.jpg';

      await expect(fileUploadService.uploadFile(buffer, filename)).rejects.toThrow('Upload failed');
    });
  });

  describe('deleteFile', () => {
    beforeEach(() => {
      config.storage.provider = 'local';
      fileUploadService = FileUploadService.getInstance();
    });

    it('should delete file successfully', async () => {
      const key = 'uploads/test.jpg';
      await fileUploadService.deleteFile(key);

      expect(mockProvider.delete).toHaveBeenCalledWith(key);
    });

    it('should handle deletion errors', async () => {
      mockProvider.delete.mockRejectedValueOnce(new Error('Delete failed'));
      const key = 'uploads/test.jpg';

      await expect(fileUploadService.deleteFile(key)).rejects.toThrow('Delete failed');
    });
  });

  describe('getFileUrl', () => {
    beforeEach(() => {
      config.storage.provider = 'local';
      fileUploadService = FileUploadService.getInstance();
    });

    it('should get file URL successfully', () => {
      const key = 'uploads/test.jpg';
      const url = fileUploadService.getFileUrl(key);

      expect(mockProvider.getUrl).toHaveBeenCalledWith(key, undefined);
      expect(url).toBe('https://example.com/file.jpg');
    });

    it('should pass expiry time when provided', () => {
      const key = 'uploads/test.jpg';
      const expiresIn = 3600;
      fileUploadService.getFileUrl(key, expiresIn);

      expect(mockProvider.getUrl).toHaveBeenCalledWith(key, expiresIn);
    });
  });

  describe('fileExists', () => {
    beforeEach(() => {
      config.storage.provider = 'local';
      fileUploadService = FileUploadService.getInstance();
    });

    it('should check if file exists', async () => {
      const key = 'uploads/test.jpg';
      const exists = await fileUploadService.fileExists(key);

      expect(mockProvider.exists).toHaveBeenCalledWith(key);
      expect(exists).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockProvider.exists.mockResolvedValueOnce(false);
      const key = 'uploads/test.jpg';
      const exists = await fileUploadService.fileExists(key);

      expect(exists).toBe(false);
    });
  });

  describe('listFiles', () => {
    beforeEach(() => {
      config.storage.provider = 'local';
      fileUploadService = FileUploadService.getInstance();
    });

    it('should list files successfully', async () => {
      const mockFiles = [
        { key: 'file1.jpg', size: 1024, lastModified: new Date() },
        { key: 'file2.jpg', size: 2048, lastModified: new Date() },
      ];
      mockProvider.list.mockResolvedValueOnce({
        files: mockFiles,
        nextContinuationToken: null,
      });

      const result = await fileUploadService.listFiles({
        prefix: 'uploads/',
        maxKeys: 10,
      });

      expect(mockProvider.list).toHaveBeenCalledWith({
        prefix: 'uploads/',
        maxKeys: 10,
      });
      expect(result.files).toHaveLength(2);
    });

    it('should handle pagination token', async () => {
      await fileUploadService.listFiles({
        prefix: 'uploads/',
        continuationToken: 'next-page-token',
      });

      expect(mockProvider.list).toHaveBeenCalledWith(
        expect.objectContaining({
          continuationToken: 'next-page-token',
        })
      );
    });
  });
});
