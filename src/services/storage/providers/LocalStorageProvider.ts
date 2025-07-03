import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  StorageProvider,
  FileUploadOptions,
  FileUploadResult,
  StorageFile,
  ListFilesOptions,
  ListFilesResult,
} from './StorageProvider.interface';
import { logger } from '../../../utils/logger';
import environment from '../../../config/environment';

interface LocalStorageConfig {
  /**
   * Base directory for file storage
   */
  baseDir: string;

  /**
   * Base URL for serving files
   */
  baseUrl: string;

  /**
   * Whether to create directories if they don't exist
   */
  createDirs?: boolean;
}

/**
 * Local file system storage provider
 * Useful for development and testing
 */
export class LocalStorageProvider extends StorageProvider {
  readonly name = 'Local';
  private config: LocalStorageConfig;

  constructor(config: LocalStorageConfig) {
    super();
    this.config = {
      createDirs: true,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    try {
      // Ensure base directory exists
      if (this.config.createDirs) {
        await fs.mkdir(this.config.baseDir, { recursive: true });
      }

      // Test write permissions
      const testFile = path.join(this.config.baseDir, '.test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

      logger.info(`Local storage provider initialized at: ${this.config.baseDir}`);
    } catch (error) {
      logger.error('Failed to initialize local storage provider:', error);
      throw new Error('Failed to initialize local storage provider');
    }
  }

  async uploadFile(buffer: Buffer, options: FileUploadOptions): Promise<FileUploadResult> {
    try {
      const filename = this.generateFilename(options.filename);
      const relativePath = this.buildRelativePath(options.folder, filename);
      const fullPath = path.join(this.config.baseDir, relativePath);

      // Ensure directory exists
      const dir = path.dirname(fullPath);
      if (this.config.createDirs) {
        await fs.mkdir(dir, { recursive: true });
      }

      // Write file
      await fs.writeFile(fullPath, buffer);

      // Calculate file hash
      const hash = crypto.createHash('md5').update(buffer).digest('hex');

      // Build URL
      const url = this.buildUrl(relativePath);

      return {
        key: relativePath,
        url,
        size: buffer.length,
        contentType: options.contentType || 'application/octet-stream',
        etag: hash,
        location: fullPath,
      };
    } catch (error) {
      logger.error('Local storage upload error:', error);
      throw new Error(`Failed to upload file to local storage: ${(error as Error).message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const fullPath = path.join(this.config.baseDir, key);
      await fs.unlink(fullPath);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, consider it deleted
        return;
      }
      logger.error('Local storage delete error:', error);
      throw new Error(`Failed to delete file from local storage: ${(error as Error).message}`);
    }
  }

  async getFileUrl(key: string, expiresIn?: number): Promise<string> {
    // For local storage, we don't support signed URLs
    // Just return the public URL
    return this.buildUrl(key);
  }

  async listFiles(options?: ListFilesOptions): Promise<ListFilesResult> {
    try {
      const searchDir = options?.prefix
        ? path.join(this.config.baseDir, options.prefix)
        : this.config.baseDir;

      const files = await this.walkDirectory(searchDir, this.config.baseDir);

      // Apply pagination
      const maxKeys = options?.maxKeys || 1000;
      const startIndex = options?.continuationToken ? parseInt(options.continuationToken, 10) : 0;
      const endIndex = startIndex + maxKeys;

      const paginatedFiles = files.slice(startIndex, endIndex);
      const hasMore = endIndex < files.length;

      return {
        files: paginatedFiles,
        nextContinuationToken: hasMore ? endIndex.toString() : undefined,
        isTruncated: hasMore,
      };
    } catch (error) {
      logger.error('Local storage list files error:', error);
      throw new Error(`Failed to list files from local storage: ${(error as Error).message}`);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.config.baseDir, key);
      await fs.access(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<StorageFile> {
    try {
      const fullPath = path.join(this.config.baseDir, key);
      const stats = await fs.stat(fullPath);

      // Calculate file hash
      const buffer = await fs.readFile(fullPath);
      const hash = crypto.createHash('md5').update(buffer).digest('hex');

      return {
        key,
        size: stats.size,
        lastModified: stats.mtime,
        etag: hash,
      };
    } catch (error) {
      logger.error('Local storage get metadata error:', error);
      throw new Error(
        `Failed to get file metadata from local storage: ${(error as Error).message}`
      );
    }
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const sourcePath = path.join(this.config.baseDir, sourceKey);
      const destPath = path.join(this.config.baseDir, destinationKey);

      // Ensure destination directory exists
      const destDir = path.dirname(destPath);
      if (this.config.createDirs) {
        await fs.mkdir(destDir, { recursive: true });
      }

      await fs.copyFile(sourcePath, destPath);
    } catch (error) {
      logger.error('Local storage copy error:', error);
      throw new Error(`Failed to copy file in local storage: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a unique filename
   */
  private generateFilename(filename?: string): string {
    if (filename) {
      return filename;
    }

    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${random}`;
  }

  /**
   * Build relative path from folder and filename
   */
  private buildRelativePath(folder?: string, filename?: string): string {
    const parts: string[] = [];

    if (folder) {
      // Remove leading/trailing slashes and add to parts
      parts.push(folder.replace(/^\/+|\/+$/g, ''));
    }

    if (filename) {
      parts.push(filename);
    }

    return parts.join('/');
  }

  /**
   * Build public URL for a file
   */
  private buildUrl(relativePath: string): string {
    // Ensure base URL doesn't end with slash
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    // Ensure relative path doesn't start with slash
    const path = relativePath.replace(/^\//, '');

    return `${baseUrl}/${path}`;
  }

  /**
   * Recursively walk directory and get all files
   */
  private async walkDirectory(dir: string, baseDir: string): Promise<StorageFile[]> {
    const files: StorageFile[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recursively walk subdirectories
          const subFiles = await this.walkDirectory(fullPath, baseDir);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          // Get file stats
          const stats = await fs.stat(fullPath);
          const relativePath = path.relative(baseDir, fullPath);

          // Calculate file hash
          const buffer = await fs.readFile(fullPath);
          const hash = crypto.createHash('md5').update(buffer).digest('hex');

          files.push({
            key: relativePath.replace(/\\/g, '/'), // Normalize path separators
            size: stats.size,
            lastModified: stats.mtime,
            etag: hash,
          });
        }
      }
    } catch (error) {
      logger.error(`Error walking directory ${dir}:`, error);
    }

    return files;
  }
}

/**
 * Factory function to create local storage provider
 */
export function createLocalStorageProvider(
  config?: Partial<LocalStorageConfig>
): LocalStorageProvider {
  const baseDir = config?.baseDir || path.join(process.cwd(), 'uploads');
  const baseUrl = config?.baseUrl || `${environment.app.baseUrl}/uploads`;

  return new LocalStorageProvider({
    baseDir,
    baseUrl,
    createDirs: true,
    ...config,
  });
}
