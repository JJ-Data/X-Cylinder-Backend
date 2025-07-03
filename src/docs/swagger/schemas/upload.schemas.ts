import { SchemaBuilder } from '../builder/SchemaBuilder';
import { exportSchemas } from '../builder/schemaExportHelper';

const sb = new SchemaBuilder();

// File upload response schemas
const FileInfoSchema = sb
  .object('FileInfo', {
    key: sb.string('File key/path in storage').example('users/123/documents/report.pdf'),
    url: sb
      .string('File URL')
      .format('uri')
      .example('https://storage.example.com/users/123/documents/report.pdf'),
    size: sb.integer('File size in bytes').example(1048576),
    mimeType: sb.string('MIME type of the file').example('application/pdf'),
    originalName: sb.string('Original file name').example('report.pdf').optional(),
    metadata: sb
      .object('FileMetadata', {
        uploadedAt: sb
          .string('Upload timestamp')
          .format('date-time')
          .example('2025-01-21T15:30:00Z'),
        contentType: sb.string('Content type').example('application/pdf'),
      })
      .description('Additional file metadata')
      .optional(),
  })
  .required(['key', 'url', 'size', 'mimeType']);

const FileUploadResponseSchema = sb.object('FileUploadResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('File uploaded successfully'),
  data: FileInfoSchema,
});

const MultipleFilesUploadResponseSchema = sb.object('MultipleFilesUploadResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Files uploaded successfully'),
  data: sb.array(FileInfoSchema).description('Array of uploaded file information'),
});

const AvatarUploadResponseSchema = sb.object('AvatarUploadResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Avatar uploaded successfully'),
  data: sb
    .object('AvatarFileInfo', {
      key: sb.string('File key/path in storage').example('avatars/123/avatar.jpg'),
      url: sb
        .string('File URL')
        .format('uri')
        .example('https://storage.example.com/avatars/123/avatar.jpg'),
      size: sb.integer('File size in bytes').example(1048576),
      mimeType: sb.string('MIME type of the file').example('image/jpeg'),
      originalName: sb.string('Original file name').example('avatar.jpg').optional(),
      metadata: sb
        .object('AvatarMetadata', {
          uploadedAt: sb
            .string('Upload timestamp')
            .format('date-time')
            .example('2025-01-21T15:30:00Z'),
          contentType: sb.string('Content type').example('image/jpeg'),
        })
        .description('Additional file metadata')
        .optional(),
      thumbnailUrl: sb
        .string('Thumbnail image URL')
        .format('uri')
        .example('https://storage.example.com/avatars/123/avatar-thumb.webp')
        .optional(),
    })
    .required(['key', 'url', 'size', 'mimeType']),
});

// File list response schemas
const FileListItemSchema = sb
  .object('FileListItem', {
    key: sb.string('File key/path').example('users/123/documents/report.pdf'),
    size: sb.integer('File size in bytes').example(1048576),
    lastModified: sb
      .string('Last modified timestamp')
      .format('date-time')
      .example('2025-01-21T15:30:00Z'),
    etag: sb.string('File ETag').example('"abc123def456"').optional(),
  })
  .required(['key', 'size', 'lastModified']);

const FileListResponseSchema = sb.object('FileListResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Files retrieved successfully'),
  data: sb
    .object('FileListData', {
      files: sb.array(FileListItemSchema).description('Array of file information'),
      prefix: sb.string('File prefix used for filtering').example('users/123/'),
      isTruncated: sb.boolean('Indicates if there are more files').example(true),
      continuationToken: sb
        .string('Token for fetching next batch')
        .example('eyJrZXkiOiJ1c2Vycy8xMjMvZmlsZS5wZGYifQ==')
        .nullable(),
      keyCount: sb.integer('Number of files returned').example(100),
    })
    .required(['files', 'prefix', 'isTruncated', 'keyCount']),
});

// File category enums
const FileCategorySchema = sb
  .enum(['image', 'document', 'video', 'audio', 'archive', 'other'], 'File category')
  .example('image');

const ImageMimeTypeSchema = sb
  .enum(
    [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/svg+xml',
    ],
    'Allowed image MIME types'
  )
  .example('image/jpeg');

const DocumentMimeTypeSchema = sb
  .enum(
    [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    'Allowed document MIME types'
  )
  .example('application/pdf');

// Export all schemas as OpenAPI objects
const schemas = {
  FileInfoSchema,
  FileUploadResponseSchema,
  MultipleFilesUploadResponseSchema,
  AvatarUploadResponseSchema,
  FileListItemSchema,
  FileListResponseSchema,
  FileCategorySchema,
  ImageMimeTypeSchema,
  DocumentMimeTypeSchema,
};

// Export all schemas as a single object for consistency with other schema files
export const uploadSchemas = exportSchemas(schemas);
