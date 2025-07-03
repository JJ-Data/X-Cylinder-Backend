import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  PutObjectCommandInput,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; // Install: npm install @aws-sdk/s3-request-presigner
import {
  StorageProvider,
  FileUploadOptions,
  FileUploadResult,
  StorageFile,
  ListFilesOptions,
  ListFilesResult,
} from './StorageProvider.interface';
import { logger } from '../../../utils/logger';

interface S3ProviderConfig {
  /**
   * S3 bucket name
   */
  bucket: string;

  /**
   * AWS region or DigitalOcean Spaces region
   */
  region: string;

  /**
   * Access key ID
   */
  accessKeyId: string;

  /**
   * Secret access key
   */
  secretAccessKey: string;

  /**
   * Custom endpoint (for DigitalOcean Spaces or MinIO)
   */
  endpoint?: string;

  /**
   * Force path style (for MinIO)
   */
  forcePathStyle?: boolean;

  /**
   * Default ACL for uploaded files
   */
  defaultAcl?: 'private' | 'public-read';

  /**
   * CDN URL for public file access
   */
  cdnUrl?: string;
}

/**
 * S3-compatible storage provider
 * Supports AWS S3, DigitalOcean Spaces, MinIO, etc.
 */
export class S3Provider extends StorageProvider {
  readonly name = 'S3';
  private client: S3Client;
  private config: S3ProviderConfig;

  constructor(config: S3ProviderConfig) {
    super();
    this.config = config;

    // Initialize S3 client
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test connection by checking if bucket exists
      await this.client
        .send(
          new HeadObjectCommand({
            Bucket: this.config.bucket,
            Key: '.test',
          })
        )
        .catch(() => {
          // Ignore error - just testing connection
        });

      logger.info(`S3 provider initialized for bucket: ${this.config.bucket}`);
    } catch (error) {
      logger.error('Failed to initialize S3 provider:', error);
      throw new Error('Failed to initialize S3 storage provider');
    }
  }

  async uploadFile(buffer: Buffer, options: FileUploadOptions): Promise<FileUploadResult> {
    try {
      const key = this.buildKey(options.folder, options.filename);
      const acl = this.getAcl(options.acl);

      const params: PutObjectCommandInput = {
        Bucket: this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: options.contentType,
        ACL: acl,
        Metadata: options.metadata,
      };

      // Add tags if provided
      if (options.tags) {
        params.Tagging = this.buildTagString(options.tags);
      }

      const command = new PutObjectCommand(params);
      const result = await this.client.send(command);

      // Build file URL
      const url = await this.buildFileUrl(key, options.acl === 'public-read');

      return {
        key,
        url,
        size: buffer.length,
        contentType: options.contentType || 'application/octet-stream',
        etag: result.ETag,
        location: `s3://${this.config.bucket}/${key}`,
      };
    } catch (error) {
      logger.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${(error as Error).message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      logger.error('S3 delete error:', error);
      throw new Error(`Failed to delete file from S3: ${(error as Error).message}`);
    }
  }

  async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      // TODO: Install @aws-sdk/s3-request-presigner to enable signed URLs
      throw new Error('Signed URL generation requires @aws-sdk/s3-request-presigner package');
    } catch (error) {
      logger.error('S3 get URL error:', error);
      throw new Error(`Failed to generate signed URL: ${(error as Error).message}`);
    }
  }

  async listFiles(options?: ListFilesOptions): Promise<ListFilesResult> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: options?.prefix,
        MaxKeys: options?.maxKeys || 1000,
        ContinuationToken: options?.continuationToken,
      });

      const result = await this.client.send(command);

      const files: StorageFile[] = (result.Contents || []).map((object) => ({
        key: object.Key!,
        size: object.Size || 0,
        lastModified: object.LastModified || new Date(),
        etag: object.ETag,
      }));

      return {
        files,
        nextContinuationToken: result.NextContinuationToken,
        isTruncated: result.IsTruncated || false,
      };
    } catch (error) {
      logger.error('S3 list files error:', error);
      throw new Error(`Failed to list files from S3: ${(error as Error).message}`);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      if ((error as any).name === 'NotFound' || (error as any).$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async getFileMetadata(key: string): Promise<StorageFile> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const result = await this.client.send(command);

      return {
        key,
        size: result.ContentLength || 0,
        lastModified: result.LastModified || new Date(),
        etag: result.ETag,
        contentType: result.ContentType,
      };
    } catch (error) {
      logger.error('S3 get metadata error:', error);
      throw new Error(`Failed to get file metadata from S3: ${(error as Error).message}`);
    }
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.config.bucket,
        CopySource: `${this.config.bucket}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.client.send(command);
    } catch (error) {
      logger.error('S3 copy error:', error);
      throw new Error(`Failed to copy file in S3: ${(error as Error).message}`);
    }
  }

  /**
   * Build the full key for a file
   */
  private buildKey(folder?: string, filename?: string): string {
    const parts: string[] = [];

    if (folder) {
      parts.push(folder.replace(/^\/+|\/+$/g, ''));
    }

    if (filename) {
      parts.push(filename);
    } else {
      // Generate a unique filename if not provided
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      parts.push(`${timestamp}-${random}`);
    }

    return parts.join('/');
  }

  /**
   * Get the ACL value
   */
  private getAcl(acl?: 'private' | 'public-read'): ObjectCannedACL | undefined {
    const aclValue = acl || this.config.defaultAcl || 'private';

    switch (aclValue) {
      case 'public-read':
        return ObjectCannedACL.public_read;
      case 'private':
      default:
        return ObjectCannedACL.private;
    }
  }

  /**
   * Build tag string for S3
   */
  private buildTagString(tags: Record<string, string>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }

  /**
   * Build file URL
   */
  private async buildFileUrl(key: string, isPublic: boolean): Promise<string> {
    if (isPublic && this.config.cdnUrl) {
      // Use CDN URL if available
      return `${this.config.cdnUrl}/${key}`;
    } else if (isPublic && this.config.endpoint) {
      // Use endpoint URL for public files
      return `${this.config.endpoint}/${this.config.bucket}/${key}`;
    } else if (isPublic) {
      // Use standard S3 URL
      return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
    } else {
      // Generate signed URL for private files
      return this.getFileUrl(key);
    }
  }
}

/**
 * Factory function to create S3 provider for AWS S3
 */
export function createS3Provider(
  config: Omit<S3ProviderConfig, 'endpoint' | 'forcePathStyle'>
): S3Provider {
  return new S3Provider(config);
}

/**
 * Factory function to create S3 provider for DigitalOcean Spaces
 */
export function createSpacesProvider(
  config: Omit<S3ProviderConfig, 'endpoint' | 'forcePathStyle'> & {
    spacesEndpoint: string;
  }
): S3Provider {
  return new S3Provider({
    ...config,
    endpoint: `https://${config.spacesEndpoint}`,
    forcePathStyle: false,
  });
}

/**
 * Factory function to create S3 provider for MinIO
 */
export function createMinioProvider(
  config: Omit<S3ProviderConfig, 'forcePathStyle'> & {
    endpoint: string;
  }
): S3Provider {
  return new S3Provider({
    ...config,
    forcePathStyle: true,
  });
}
