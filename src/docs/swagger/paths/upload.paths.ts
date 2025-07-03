import { PathBuilder } from '../builder/PathBuilder';

const pb = new PathBuilder();

export const uploadPaths = {
  '/upload/single': {
    post: pb
      .endpoint('uploadSingleFile', 'Upload')
      .summary('Upload a single file')
      .description(
        'Upload a single file with automatic content validation and optional image processing'
      )
      .security([{ BearerAuth: [] }])
      .fileUpload()
      .response(200, 'FileUploadResponse', 'File uploaded successfully')
      .response(400, 'Error', 'No file uploaded or invalid file')
      .response(401, 'Error', 'Unauthorized')
      .response(413, 'Error', 'File size exceeds limit (10MB)')
      .response(415, 'Error', 'File type not allowed')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/upload/multiple': {
    post: pb
      .endpoint('uploadMultipleFiles', 'Upload')
      .summary('Upload multiple files')
      .description('Upload up to 5 files at once with automatic content validation')
      .security([{ BearerAuth: [] }])
      .multipleFiles()
      .response(200, 'MultipleFilesUploadResponse', 'Files uploaded successfully')
      .response(400, 'Error', 'No files uploaded or validation error')
      .response(401, 'Error', 'Unauthorized')
      .response(413, 'Error', 'File size exceeds limit (10MB per file)')
      .response(415, 'Error', 'File type not allowed')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/upload/avatar': {
    post: pb
      .endpoint('uploadAvatar', 'Upload')
      .summary('Upload user avatar')
      .description(
        'Upload a user avatar image with automatic resizing and format conversion to WebP'
      )
      .security([{ BearerAuth: [] }])
      .fileUpload()
      .response(200, 'AvatarUploadResponse', 'Avatar uploaded successfully')
      .response(400, 'Error', 'No file uploaded or invalid image')
      .response(401, 'Error', 'Unauthorized')
      .response(413, 'Error', 'File size exceeds limit (5MB)')
      .response(415, 'Error', 'Only image files allowed')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/upload': {
    delete: pb
      .endpoint('deleteFile', 'Upload')
      .summary('Delete a file')
      .description('Delete a file from storage. Users can only delete their own files.')
      .security([{ BearerAuth: [] }])
      .query('key', 'string', true, 'The file key/path to delete')
      .response(200, 'SuccessResponse', 'File deleted successfully')
      .response(400, 'Error', 'File key is required')
      .response(401, 'Error', 'Unauthorized')
      .response(403, 'Error', 'Cannot delete files belonging to other users')
      .response(404, 'Error', 'File not found')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/upload/list': {
    get: pb
      .endpoint('listUserFiles', 'Upload')
      .summary('List user files')
      .description('Get a paginated list of files uploaded by the authenticated user')
      .security([{ BearerAuth: [] }])
      .query('prefix', 'string', false, 'File prefix for filtering')
      .query('maxKeys', 'integer', false, 'Maximum number of keys to return')
      .query('continuationToken', 'string', false, 'Continuation token for pagination')
      .response(200, 'FileListResponse', 'Files retrieved successfully')
      .response(401, 'Error', 'Unauthorized')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },
};
