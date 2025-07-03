/**
 * Storage Provider Interface
 * Abstract class and interfaces for file storage operations
 */

/**
 * Options for file upload
 */
export interface FileUploadOptions {
  /**
   * Target folder/directory in the storage
   */
  folder?: string;

  /**
   * Custom filename (without extension)
   */
  filename?: string;

  /**
   * Access control for the file
   */
  acl?: 'private' | 'public-read';

  /**
   * Content type of the file
   */
  contentType?: string;

  /**
   * Metadata to attach to the file
   */
  metadata?: Record<string, string>;

  /**
   * Tags for the file (useful for S3)
   */
  tags?: Record<string, string>;
}

/**
 * Result of file upload operation
 */
export interface FileUploadResult {
  /**
   * Unique identifier of the file in storage
   */
  key: string;

  /**
   * Full URL to access the file
   */
  url: string;

  /**
   * Size of the file in bytes
   */
  size: number;

  /**
   * MIME type of the file
   */
  contentType: string;

  /**
   * ETag or checksum of the file
   */
  etag?: string;

  /**
   * Storage location/bucket
   */
  location?: string;
}

/**
 * Represents a file in storage
 */
export interface StorageFile {
  /**
   * File key/path in storage
   */
  key: string;

  /**
   * File size in bytes
   */
  size: number;

  /**
   * Last modified timestamp
   */
  lastModified: Date;

  /**
   * ETag or checksum
   */
  etag?: string;

  /**
   * Content type
   */
  contentType?: string;
}

/**
 * Options for listing files
 */
export interface ListFilesOptions {
  /**
   * Prefix/folder to list files from
   */
  prefix?: string;

  /**
   * Maximum number of files to return
   */
  maxKeys?: number;

  /**
   * Continuation token for pagination
   */
  continuationToken?: string;
}

/**
 * Result of list files operation
 */
export interface ListFilesResult {
  /**
   * Array of files
   */
  files: StorageFile[];

  /**
   * Token for next page (if any)
   */
  nextContinuationToken?: string;

  /**
   * Whether there are more files
   */
  isTruncated: boolean;
}

/**
 * Abstract Storage Provider class
 * All storage providers must extend this class
 */
export abstract class StorageProvider {
  /**
   * Provider name for identification
   */
  abstract readonly name: string;

  /**
   * Initialize the storage provider
   */
  abstract initialize(): Promise<void>;

  /**
   * Upload a file to storage
   * @param buffer File buffer
   * @param options Upload options
   * @returns Upload result
   */
  abstract uploadFile(buffer: Buffer, options: FileUploadOptions): Promise<FileUploadResult>;

  /**
   * Delete a file from storage
   * @param key File key to delete
   */
  abstract deleteFile(key: string): Promise<void>;

  /**
   * Get a signed URL for file access
   * @param key File key
   * @param expiresIn Expiration time in seconds
   * @returns Signed URL
   */
  abstract getFileUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * List files in storage
   * @param options List options
   * @returns List result
   */
  abstract listFiles(options?: ListFilesOptions): Promise<ListFilesResult>;

  /**
   * Check if a file exists
   * @param key File key
   * @returns True if file exists
   */
  abstract fileExists(key: string): Promise<boolean>;

  /**
   * Get file metadata
   * @param key File key
   * @returns File metadata
   */
  abstract getFileMetadata(key: string): Promise<StorageFile>;

  /**
   * Copy a file within storage
   * @param sourceKey Source file key
   * @param destinationKey Destination file key
   */
  abstract copyFile(sourceKey: string, destinationKey: string): Promise<void>;

  /**
   * Move a file within storage
   * @param sourceKey Source file key
   * @param destinationKey Destination file key
   */
  async moveFile(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copyFile(sourceKey, destinationKey);
    await this.deleteFile(sourceKey);
  }
}
