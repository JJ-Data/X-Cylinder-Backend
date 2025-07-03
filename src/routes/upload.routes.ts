import { Router, Request, Response } from 'express';
import { authenticate } from '@middlewares/auth.middleware';
import {
  uploadSingle,
  uploadArray,
  validateUploadedFiles,
  FILE_TYPE_CATEGORIES,
} from '@middlewares/upload';
import { fileUploadService } from '@services/storage';
import { asyncHandler } from '@utils/helpers';
import { ResponseUtil } from '@utils/response';
import { logger } from '@utils/logger';

const router: Router = Router();

/**
 * @route POST /api/upload/single
 * @desc Upload a single file
 * @access Private
 */
router.post(
  '/single',
  authenticate,
  uploadSingle({
    fieldName: 'file',
    allowedCategories: ['image', 'document'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  }),
  validateUploadedFiles({ required: true }),
  asyncHandler(async (req: Request, res: Response) => {
    const fileInfo = (req as any).fileInfo;

    if (!fileInfo) {
      return ResponseUtil.error(res, 'No file uploaded', 400);
    }

    try {
      // Upload file with image processing for images
      const result = await fileUploadService.uploadFile(fileInfo.buffer, fileInfo.originalName, {
        folder: `users/${req.user!.id}`,
        generateUniqueName: true,
        validation: {
          validateContent: true,
        },
        imageProcessing: fileInfo.mimeType.startsWith('image/')
          ? {
              resize: {
                width: 1200,
                height: 1200,
                fit: 'inside',
              },
              quality: 85,
              stripMetadata: true,
              thumbnail: {
                width: 200,
                height: 200,
                suffix: 'thumb',
              },
            }
          : undefined,
      });

      return ResponseUtil.success(res, result, 'File uploaded successfully');
    } catch (error) {
      logger.error('File upload error:', error);
      return ResponseUtil.error(res, (error as Error).message || 'Failed to upload file', 500);
    }
  })
);

/**
 * @route POST /api/upload/multiple
 * @desc Upload multiple files
 * @access Private
 */
router.post(
  '/multiple',
  authenticate,
  uploadArray({
    fieldName: 'files',
    maxFiles: 5,
    allowedCategories: ['image', 'document'],
    maxFileSize: 10 * 1024 * 1024, // 10MB per file
  }),
  validateUploadedFiles({ required: true, minFiles: 1, maxFiles: 5 }),
  asyncHandler(async (req: Request, res: Response) => {
    const filesInfo = (req as any).filesInfo;

    if (!filesInfo || filesInfo.length === 0) {
      return ResponseUtil.error(res, 'No files uploaded', 400);
    }

    try {
      // Upload all files
      const uploadPromises = filesInfo.map((fileInfo: any) =>
        fileUploadService.uploadFile(fileInfo.buffer, fileInfo.originalName, {
          folder: `users/${req.user!.id}`,
          generateUniqueName: true,
          validation: {
            validateContent: true,
          },
        })
      );

      const results = await Promise.all(uploadPromises);

      return ResponseUtil.success(res, results, 'Files uploaded successfully');
    } catch (error) {
      logger.error('Multiple files upload error:', error);
      return ResponseUtil.error(res, (error as Error).message || 'Failed to upload files', 500);
    }
  })
);

/**
 * @route POST /api/upload/avatar
 * @desc Upload user avatar
 * @access Private
 */
router.post(
  '/avatar',
  authenticate,
  uploadSingle({
    fieldName: 'avatar',
    allowedMimeTypes: FILE_TYPE_CATEGORIES.image,
    maxFileSize: 5 * 1024 * 1024, // 5MB
  }),
  validateUploadedFiles({ required: true }),
  asyncHandler(async (req: Request, res: Response) => {
    const fileInfo = (req as any).fileInfo;

    if (!fileInfo) {
      return ResponseUtil.error(res, 'No file uploaded', 400);
    }

    try {
      // Upload avatar with specific processing
      const result = await fileUploadService.uploadFile(fileInfo.buffer, fileInfo.originalName, {
        folder: `avatars/${req.user!.id}`,
        generateUniqueName: true,
        acl: 'public-read', // Make avatars publicly accessible
        validation: {
          validateContent: true,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        },
        imageProcessing: {
          resize: {
            width: 400,
            height: 400,
            fit: 'cover',
            position: 'center',
          },
          format: 'webp',
          quality: 90,
          stripMetadata: true,
          thumbnail: {
            width: 100,
            height: 100,
            suffix: 'thumb',
          },
        },
      });

      // TODO: Update user's avatar URL in database
      // await userService.updateAvatar(req.user!.id, result.url);

      return ResponseUtil.success(res, result, 'Avatar uploaded successfully');
    } catch (error) {
      logger.error('Avatar upload error:', error);
      return ResponseUtil.error(res, (error as Error).message || 'Failed to upload avatar', 500);
    }
  })
);

/**
 * @route DELETE /api/upload?key=path/to/file
 * @desc Delete a file
 * @access Private
 */
router.delete(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const key = req.query.key as string;

    if (!key) {
      return ResponseUtil.error(res, 'File key is required', 400);
    }

    try {
      // Check if user has permission to delete the file
      // This is a simple check - you might want to implement more complex permissions
      if (
        !key.startsWith(`users/${req.user!.id}/`) &&
        !key.startsWith(`avatars/${req.user!.id}/`)
      ) {
        return ResponseUtil.error(res, 'Unauthorized to delete this file', 403);
      }

      await fileUploadService.deleteFile(key);

      return ResponseUtil.success(res, null, 'File deleted successfully');
    } catch (error) {
      logger.error('File deletion error:', error);
      return ResponseUtil.error(res, (error as Error).message || 'Failed to delete file', 500);
    }
  })
);

/**
 * @route GET /api/upload/list
 * @desc List user's files
 * @access Private
 */
router.get(
  '/list',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { prefix, maxKeys, continuationToken } = req.query;

    try {
      const userPrefix = prefix ? `users/${req.user!.id}/${prefix}` : `users/${req.user!.id}/`;

      const result = await fileUploadService.listFiles({
        prefix: userPrefix,
        maxKeys: maxKeys ? parseInt(maxKeys as string, 10) : 100,
        continuationToken: continuationToken as string,
      });

      return ResponseUtil.success(res, result, 'Files retrieved successfully');
    } catch (error) {
      logger.error('List files error:', error);
      return ResponseUtil.error(res, (error as Error).message || 'Failed to list files', 500);
    }
  })
);

export default router;
