import multer, { FileFilterCallback, StorageEngine } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/errors';
import mime from 'mime-types';
import { logger } from '../../utils/logger';

type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
};

/**
 * File type categories with their allowed MIME types
 */
export const FILE_TYPE_CATEGORIES = {
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif',
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
  video: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/webm',
  ],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/webm'],
  archive: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
  ],
};

/**
 * Default file size limits by category (in bytes)
 */
export const DEFAULT_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  document: 25 * 1024 * 1024, // 25MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 50 * 1024 * 1024, // 50MB
  archive: 50 * 1024 * 1024, // 50MB
  default: 10 * 1024 * 1024, // 10MB
};

/**
 * Upload middleware configuration
 */
export interface UploadConfig {
  /**
   * Field name for single file upload
   */
  fieldName?: string;

  /**
   * Field names for multiple file upload
   */
  fields?: Array<{
    name: string;
    maxCount?: number;
  }>;

  /**
   * Maximum number of files for array upload
   */
  maxFiles?: number;

  /**
   * Allowed file categories
   */
  allowedCategories?: Array<keyof typeof FILE_TYPE_CATEGORIES>;

  /**
   * Custom allowed MIME types (overrides categories)
   */
  allowedMimeTypes?: string[];

  /**
   * Maximum file size in bytes
   */
  maxFileSize?: number;

  /**
   * Custom file size limits by category
   */
  sizeLimits?: Partial<Record<keyof typeof FILE_TYPE_CATEGORIES, number>>;

  /**
   * Whether to store files in memory (default) or disk
   */
  storage?: 'memory' | 'disk';

  /**
   * Destination for disk storage
   */
  destination?: string;

  /**
   * Custom filename function for disk storage
   */
  filename?: (
    req: Request,
    file: MulterFile,
    cb: (error: Error | null, filename: string) => void
  ) => void;
}

/**
 * Create multer storage based on configuration
 */
function createStorage(config: UploadConfig): StorageEngine {
  if (config.storage === 'disk') {
    return multer.diskStorage({
      destination: config.destination || 'uploads/',
      filename:
        config.filename ||
        ((req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const extension = mime.extension(file.mimetype) || 'bin';
          cb(null, `${file.fieldname}-${uniqueSuffix}.${extension}`);
        }),
    });
  }

  // Default to memory storage
  return multer.memoryStorage();
}

/**
 * Create file filter based on configuration
 */
function createFileFilter(config: UploadConfig) {
  return (req: Request, file: MulterFile, cb: FileFilterCallback) => {
    // Get allowed MIME types
    let allowedMimeTypes: string[] = [];

    if (config.allowedMimeTypes) {
      allowedMimeTypes = config.allowedMimeTypes;
    } else if (config.allowedCategories) {
      allowedMimeTypes = config.allowedCategories.flatMap(
        (category) => FILE_TYPE_CATEGORIES[category] || []
      );
    } else {
      // Allow all file types if no restrictions specified
      cb(null, true);
      return;
    }

    // Check if file type is allowed
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          `File type '${file.mimetype}' is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
          400
        )
      );
    }
  };
}

/**
 * Get file size limit based on configuration and file type
 */
function getFileSizeLimit(config: UploadConfig, mimeType?: string): number {
  // Use custom max file size if specified
  if (config.maxFileSize) {
    return config.maxFileSize;
  }

  // Find category for MIME type
  if (mimeType) {
    for (const [category, mimeTypes] of Object.entries(FILE_TYPE_CATEGORIES)) {
      if (mimeTypes.includes(mimeType)) {
        // Use custom size limit for category if specified
        if (config.sizeLimits && config.sizeLimits[category as keyof typeof FILE_TYPE_CATEGORIES]) {
          return config.sizeLimits[category as keyof typeof FILE_TYPE_CATEGORIES]!;
        }
        // Use default size limit for category
        return DEFAULT_SIZE_LIMITS[category as keyof typeof DEFAULT_SIZE_LIMITS];
      }
    }
  }

  // Use default size limit
  return DEFAULT_SIZE_LIMITS.default;
}

/**
 * Create upload middleware for single file
 */
export function uploadSingle(config: UploadConfig = {}) {
  const fieldName = config.fieldName || 'file';
  const maxFileSize = getFileSizeLimit(config);

  const upload = multer({
    storage: createStorage(config),
    fileFilter: createFileFilter(config),
    limits: {
      fileSize: maxFileSize,
    },
  });

  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err: any) => {
      if (err) {
        logger.error('Upload error:', err);

        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return next(
                new AppError(`File too large. Maximum size is ${maxFileSize} bytes`, 400)
              );
            case 'LIMIT_UNEXPECTED_FILE':
              return next(new AppError(`Unexpected field name. Expected '${fieldName}'`, 400));
            default:
              return next(new AppError(err.message, 400));
          }
        }

        return next(err);
      }

      // Add file info to request
      if (req.file) {
        (req as any).fileInfo = {
          fieldName: req.file.fieldname,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer,
          path: req.file.path,
        };
      }

      next();
    });
  };
}

/**
 * Create upload middleware for multiple files with same field name
 */
export function uploadArray(config: UploadConfig = {}) {
  const fieldName = config.fieldName || 'files';
  const maxFiles = config.maxFiles || 10;
  const maxFileSize = getFileSizeLimit(config);

  const upload = multer({
    storage: createStorage(config),
    fileFilter: createFileFilter(config),
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
    },
  });

  return (req: Request, res: Response, next: NextFunction) => {
    upload.array(fieldName, maxFiles)(req, res, (err: any) => {
      if (err) {
        logger.error('Upload error:', err);

        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return next(
                new AppError(`File too large. Maximum size is ${maxFileSize} bytes`, 400)
              );
            case 'LIMIT_FILE_COUNT':
              return next(new AppError(`Too many files. Maximum is ${maxFiles} files`, 400));
            case 'LIMIT_UNEXPECTED_FILE':
              return next(new AppError(`Unexpected field name. Expected '${fieldName}'`, 400));
            default:
              return next(new AppError(err.message, 400));
          }
        }

        return next(err);
      }

      // Add files info to request
      if (req.files && Array.isArray(req.files)) {
        (req as any).filesInfo = req.files.map((file) => ({
          fieldName: file.fieldname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          buffer: file.buffer,
          path: file.path,
        }));
      }

      next();
    });
  };
}

/**
 * Create upload middleware for multiple files with different field names
 */
export function uploadFields(config: UploadConfig = {}) {
  if (!config.fields || config.fields.length === 0) {
    throw new Error('Fields configuration is required for uploadFields');
  }

  const maxFileSize = getFileSizeLimit(config);

  const upload = multer({
    storage: createStorage(config),
    fileFilter: createFileFilter(config),
    limits: {
      fileSize: maxFileSize,
    },
  });

  return (req: Request, res: Response, next: NextFunction) => {
    upload.fields(config.fields!)(req, res, (err: any) => {
      if (err) {
        logger.error('Upload error:', err);

        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return next(
                new AppError(`File too large. Maximum size is ${maxFileSize} bytes`, 400)
              );
            case 'LIMIT_UNEXPECTED_FILE':
              return next(new AppError('Unexpected field name', 400));
            default:
              return next(new AppError(err.message, 400));
          }
        }

        return next(err);
      }

      // Add files info to request
      if (req.files && !Array.isArray(req.files)) {
        const filesInfo: Record<string, any[]> = {};

        for (const [fieldName, files] of Object.entries(req.files)) {
          filesInfo[fieldName] = files.map((file) => ({
            fieldName: file.fieldname,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            buffer: file.buffer,
            path: file.path,
          }));
        }

        (req as any).filesInfo = filesInfo;
      }

      next();
    });
  };
}

/**
 * Create upload middleware for any files
 */
export function uploadAny(config: UploadConfig = {}) {
  const maxFileSize = getFileSizeLimit(config);

  const upload = multer({
    storage: createStorage(config),
    fileFilter: createFileFilter(config),
    limits: {
      fileSize: maxFileSize,
    },
  });

  return (req: Request, res: Response, next: NextFunction) => {
    upload.any()(req, res, (err: any) => {
      if (err) {
        logger.error('Upload error:', err);

        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return next(
                new AppError(`File too large. Maximum size is ${maxFileSize} bytes`, 400)
              );
            default:
              return next(new AppError(err.message, 400));
          }
        }

        return next(err);
      }

      // Add files info to request
      if (req.files && Array.isArray(req.files)) {
        (req as any).filesInfo = req.files.map((file) => ({
          fieldName: file.fieldname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          buffer: file.buffer,
          path: file.path,
        }));
      }

      next();
    });
  };
}

/**
 * Middleware to validate uploaded files after multer processing
 */
export function validateUploadedFiles(
  config: {
    required?: boolean;
    minFiles?: number;
    maxFiles?: number;
  } = {}
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const fileInfo = (req as any).fileInfo;
    const filesInfo = (req as any).filesInfo;

    // Check if files are required
    if (config.required && !fileInfo && !filesInfo) {
      return next(new AppError('No files uploaded', 400));
    }

    // Check minimum number of files
    if (config.minFiles && filesInfo) {
      const fileCount = Array.isArray(filesInfo)
        ? filesInfo.length
        : Object.values(filesInfo).flat().length;
      if (fileCount < config.minFiles) {
        return next(new AppError(`Minimum ${config.minFiles} files required`, 400));
      }
    }

    // Check maximum number of files
    if (config.maxFiles && filesInfo) {
      const fileCount = Array.isArray(filesInfo)
        ? filesInfo.length
        : Object.values(filesInfo).flat().length;
      if (fileCount > config.maxFiles) {
        return next(new AppError(`Maximum ${config.maxFiles} files allowed`, 400));
      }
    }

    next();
  };
}
