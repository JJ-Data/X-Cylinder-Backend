import { FileUploadService, createFileUploadService } from './FileUploadService';
import { config } from '../../config/environment';
import { logger } from '../../utils/logger';

// Export all types and classes
export * from './FileUploadService';
export * from './providers/StorageProvider.interface';
export * from './providers/S3Provider';
export * from './providers/LocalStorageProvider';

// Create and export a singleton instance of FileUploadService
let _fileUploadService: FileUploadService | null = null;

/**
 * Get the singleton file upload service instance
 */
export function getFileUploadService(): FileUploadService {
  if (!_fileUploadService) {
    _fileUploadService = createFileUploadServiceFromConfig();
  }
  return _fileUploadService;
}

/**
 * Create file upload service from configuration
 */
function createFileUploadServiceFromConfig(): FileUploadService {
  const providers: any = {};

  // Configure providers based on environment
  switch (config.storage.provider) {
    case 'local':
      providers.local = true;
      break;

    case 's3':
      providers.s3 = {
        bucket: config.storage.s3.bucket,
        region: config.storage.s3.region,
        accessKeyId: config.storage.s3.accessKeyId,
        secretAccessKey: config.storage.s3.secretAccessKey,
        defaultAcl: config.storage.s3.defaultAcl as 'private' | 'public-read',
        cdnUrl: config.storage.s3.cdnUrl,
      };
      break;

    case 'spaces':
      providers.spaces = {
        bucket: config.storage.spaces.bucket,
        region: config.storage.spaces.region,
        accessKeyId: config.storage.spaces.accessKeyId,
        secretAccessKey: config.storage.spaces.secretAccessKey,
        spacesEndpoint: config.storage.spaces.endpoint,
        defaultAcl: config.storage.spaces.defaultAcl as 'private' | 'public-read',
        cdnUrl: config.storage.spaces.cdnUrl,
      };
      break;

    default:
      // Default to local storage
      providers.local = true;
  }

  // Always enable local storage in development
  if (config.isDevelopment) {
    providers.local = true;
  }

  const service = createFileUploadService({
    defaultProvider: config.storage.provider,
    providers,
  });

  // Initialize the service
  service.initialize().catch((error) => {
    logger.error('Failed to initialize file upload service:', error);
  });

  return service;
}

// Export the singleton instance
export const fileUploadService = getFileUploadService();
