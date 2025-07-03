import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import mime from 'mime-types';
import {
  StorageProvider,
  FileUploadOptions,
  FileUploadResult,
  ListFilesOptions,
  ListFilesResult,
} from './providers/StorageProvider.interface';
import { createS3Provider, createSpacesProvider } from './providers/S3Provider';
import { createLocalStorageProvider } from './providers/LocalStorageProvider';
import { logger } from '../../utils/logger';

/**
 * File validation options
 */
export interface FileValidationOptions {
  /**
   * Maximum file size in bytes
   */
  maxSize?: number;

  /**
   * Allowed MIME types
   */
  allowedMimeTypes?: string[];

  /**
   * Allowed file extensions
   */
  allowedExtensions?: string[];

  /**
   * Whether to validate file content (magic bytes)
   */
  validateContent?: boolean;
}

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  /**
   * Resize options
   */
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    position?:
      | 'top'
      | 'right top'
      | 'right'
      | 'right bottom'
      | 'bottom'
      | 'left bottom'
      | 'left'
      | 'left top'
      | 'center';
  };

  /**
   * Image quality (1-100)
   */
  quality?: number;

  /**
   * Output format
   */
  format?: 'jpeg' | 'jpg' | 'png' | 'webp' | 'avif';

  /**
   * Whether to strip metadata
   */
  stripMetadata?: boolean;

  /**
   * Generate thumbnail
   */
  thumbnail?: {
    width: number;
    height: number;
    suffix?: string;
  };
}

/**
 * Upload options
 */
export interface UploadOptions extends FileUploadOptions {
  /**
   * Validation options
   */
  validation?: FileValidationOptions;

  /**
   * Image processing options (only for images)
   */
  imageProcessing?: ImageProcessingOptions;

  /**
   * Whether to generate unique filename
   */
  generateUniqueName?: boolean;

  /**
   * Prefix for generated filename
   */
  filenamePrefix?: string;

  /**
   * Whether to preserve original filename
   */
  preserveOriginalName?: boolean;
}

/**
 * File upload result with additional metadata
 */
export interface EnhancedFileUploadResult extends FileUploadResult {
  /**
   * Original filename
   */
  originalName?: string;

  /**
   * File extension
   */
  extension?: string;

  /**
   * Detected MIME type
   */
  detectedMimeType?: string;

  /**
   * Thumbnail information (if generated)
   */
  thumbnail?: FileUploadResult;
}

/**
 * File Upload Service
 * Handles file validation, processing, and storage
 */
export class FileUploadService {
  private providers: Map<string, StorageProvider> = new Map();
  private defaultProvider: string;

  constructor(defaultProvider?: string) {
    this.defaultProvider = defaultProvider || 'local';
  }

  /**
   * Register a storage provider
   */
  registerProvider(name: string, provider: StorageProvider): void {
    this.providers.set(name, provider);
    logger.info(`Registered storage provider: ${name}`);
  }

  /**
   * Get a storage provider
   */
  getProvider(name?: string): StorageProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Storage provider not found: ${providerName}`);
    }

    return provider;
  }

  /**
   * Initialize all providers
   */
  async initialize(): Promise<void> {
    const initPromises = Array.from(this.providers.values()).map((provider) =>
      provider.initialize().catch((error) => {
        logger.error(`Failed to initialize provider ${provider.name}:`, error);
        throw error;
      })
    );

    await Promise.all(initPromises);
    logger.info('All storage providers initialized');
  }

  /**
   * Upload a file with validation and processing
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    options: UploadOptions = {},
    providerName?: string
  ): Promise<EnhancedFileUploadResult> {
    try {
      // Validate file
      if (options.validation) {
        await this.validateFile(buffer, originalName, options.validation);
      }

      // Detect file type
      const fileType = await this.detectFileType(buffer, originalName);

      // Process image if needed
      let processedBuffer = buffer;
      let thumbnailResult: FileUploadResult | undefined;

      if (this.isImage(fileType.mimeType) && options.imageProcessing) {
        const processed = await this.processImage(buffer, options.imageProcessing);
        processedBuffer = processed.main;

        // Upload thumbnail if generated
        if (processed.thumbnail && options.imageProcessing.thumbnail) {
          const thumbnailName = this.generateThumbnailName(
            originalName,
            options.imageProcessing.thumbnail.suffix
          );

          thumbnailResult = await this.uploadProcessedFile(
            processed.thumbnail,
            thumbnailName,
            fileType.mimeType,
            options,
            providerName
          );
        }
      }

      // Generate filename
      const filename = this.generateFilename(originalName, fileType.extension, options);

      // Upload main file
      const uploadOptions: FileUploadOptions = {
        ...options,
        filename,
        contentType: fileType.mimeType,
      };

      const provider = this.getProvider(providerName);
      const result = await provider.uploadFile(processedBuffer, uploadOptions);

      return {
        ...result,
        originalName,
        extension: fileType.extension,
        detectedMimeType: fileType.mimeType,
        thumbnail: thumbnailResult,
      };
    } catch (error) {
      logger.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    files: Array<{ buffer: Buffer; originalName: string }>,
    options: UploadOptions = {},
    providerName?: string
  ): Promise<EnhancedFileUploadResult[]> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(file.buffer, file.originalName, options, providerName)
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file
   */
  async deleteFile(key: string, providerName?: string): Promise<void> {
    const provider = this.getProvider(providerName);
    await provider.deleteFile(key);
  }

  /**
   * Delete multiple files
   */
  async deleteMultiple(keys: string[], providerName?: string): Promise<void> {
    const provider = this.getProvider(providerName);
    const deletePromises = keys.map((key) => provider.deleteFile(key));
    await Promise.all(deletePromises);
  }

  /**
   * Get file URL
   */
  async getFileUrl(key: string, expiresIn?: number, providerName?: string): Promise<string> {
    const provider = this.getProvider(providerName);
    return provider.getFileUrl(key, expiresIn);
  }

  /**
   * List files
   */
  async listFiles(options?: ListFilesOptions, providerName?: string): Promise<ListFilesResult> {
    const provider = this.getProvider(providerName);
    return provider.listFiles(options);
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string, providerName?: string): Promise<boolean> {
    const provider = this.getProvider(providerName);
    return provider.fileExists(key);
  }

  /**
   * Move file
   */
  async moveFile(sourceKey: string, destinationKey: string, providerName?: string): Promise<void> {
    const provider = this.getProvider(providerName);
    await provider.moveFile(sourceKey, destinationKey);
  }

  /**
   * Copy file
   */
  async copyFile(sourceKey: string, destinationKey: string, providerName?: string): Promise<void> {
    const provider = this.getProvider(providerName);
    await provider.copyFile(sourceKey, destinationKey);
  }

  /**
   * Validate file
   */
  private async validateFile(
    buffer: Buffer,
    originalName: string,
    options: FileValidationOptions
  ): Promise<void> {
    // Check file size
    if (options.maxSize && buffer.length > options.maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${options.maxSize} bytes`);
    }

    // Get file extension
    const extension = path.extname(originalName).toLowerCase().slice(1);

    // Check allowed extensions
    if (options.allowedExtensions && options.allowedExtensions.length > 0) {
      if (!options.allowedExtensions.includes(extension)) {
        throw new Error(`File extension '${extension}' is not allowed`);
      }
    }

    // Check MIME type
    if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
      const mimeType = mime.lookup(originalName) || 'application/octet-stream';
      if (!options.allowedMimeTypes.includes(mimeType)) {
        throw new Error(`MIME type '${mimeType}' is not allowed`);
      }
    }

    // Validate file content (magic bytes)
    if (options.validateContent) {
      const fileType = await fileTypeFromBuffer(buffer);
      if (!fileType) {
        throw new Error('Could not determine file type from content');
      }

      if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(fileType.mime)) {
        throw new Error(`Detected MIME type '${fileType.mime}' does not match allowed types`);
      }
    }
  }

  /**
   * Detect file type
   */
  private async detectFileType(
    buffer: Buffer,
    originalName: string
  ): Promise<{ mimeType: string; extension: string }> {
    // Try to detect from buffer
    const detected = await fileTypeFromBuffer(buffer);
    if (detected) {
      return {
        mimeType: detected.mime,
        extension: detected.ext,
      };
    }

    // Fall back to filename
    const extension = path.extname(originalName).toLowerCase().slice(1);
    const mimeType = mime.lookup(originalName) || 'application/octet-stream';

    return { mimeType, extension };
  }

  /**
   * Check if MIME type is an image
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Process image
   */
  private async processImage(
    buffer: Buffer,
    options: ImageProcessingOptions
  ): Promise<{ main: Buffer; thumbnail?: Buffer }> {
    let pipeline = sharp(buffer);

    // Strip metadata if requested
    if (options.stripMetadata) {
      pipeline = pipeline.rotate(); // Auto-rotate based on EXIF
    }

    // Resize if needed
    if (options.resize) {
      pipeline = pipeline.resize({
        width: options.resize.width,
        height: options.resize.height,
        fit: options.resize.fit || 'cover',
        position: options.resize.position || 'center',
      });
    }

    // Set format and quality
    if (options.format) {
      switch (options.format) {
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({ quality: options.quality || 80 });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: options.quality || 80 });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality: options.quality || 80 });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality: options.quality || 80 });
          break;
      }
    }

    // Process main image
    const mainBuffer = await pipeline.toBuffer();

    // Generate thumbnail if requested
    let thumbnailBuffer: Buffer | undefined;
    if (options.thumbnail) {
      thumbnailBuffer = await sharp(buffer)
        .resize({
          width: options.thumbnail.width,
          height: options.thumbnail.height,
          fit: 'cover',
          position: 'center',
        })
        .toBuffer();
    }

    return {
      main: mainBuffer,
      thumbnail: thumbnailBuffer,
    };
  }

  /**
   * Generate filename
   */
  private generateFilename(
    originalName: string,
    extension: string,
    options: UploadOptions
  ): string {
    if (options.preserveOriginalName && !options.generateUniqueName) {
      return originalName;
    }

    const nameWithoutExt = path.basename(originalName, path.extname(originalName));
    const parts: string[] = [];

    // Add prefix if provided
    if (options.filenamePrefix) {
      parts.push(options.filenamePrefix);
    }

    // Add original name or generate unique name
    if (options.generateUniqueName) {
      parts.push(uuidv4());
    } else if (options.preserveOriginalName) {
      // Sanitize filename
      const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');
      parts.push(sanitized);
      parts.push(Date.now().toString());
    }

    // Join parts and add extension
    const filename = parts.join('-');
    return `${filename}.${extension}`;
  }

  /**
   * Generate thumbnail name
   */
  private generateThumbnailName(originalName: string, suffix?: string): string {
    const nameWithoutExt = path.basename(originalName, path.extname(originalName));
    const extension = path.extname(originalName);
    const thumbnailSuffix = suffix || 'thumb';

    return `${nameWithoutExt}-${thumbnailSuffix}${extension}`;
  }

  /**
   * Upload processed file
   */
  private async uploadProcessedFile(
    buffer: Buffer,
    filename: string,
    contentType: string,
    options: UploadOptions,
    providerName?: string
  ): Promise<FileUploadResult> {
    const uploadOptions: FileUploadOptions = {
      folder: options.folder,
      filename,
      contentType,
      acl: options.acl,
      metadata: options.metadata,
      tags: options.tags,
    };

    const provider = this.getProvider(providerName);
    return provider.uploadFile(buffer, uploadOptions);
  }
}

/**
 * Create a configured file upload service
 */
export function createFileUploadService(config: {
  defaultProvider?: string;
  providers?: {
    local?: boolean;
    s3?: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      defaultAcl?: 'private' | 'public-read';
      cdnUrl?: string;
    };
    spaces?: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      spacesEndpoint: string;
      defaultAcl?: 'private' | 'public-read';
      cdnUrl?: string;
    };
  };
}): FileUploadService {
  const service = new FileUploadService(config.defaultProvider);

  // Register providers based on config
  if (config.providers?.local) {
    service.registerProvider('local', createLocalStorageProvider());
  }

  if (config.providers?.s3) {
    service.registerProvider('s3', createS3Provider(config.providers.s3));
  }

  if (config.providers?.spaces) {
    service.registerProvider('spaces', createSpacesProvider(config.providers.spaces));
  }

  return service;
}
