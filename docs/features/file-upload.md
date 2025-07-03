# File Upload Service Documentation

## Overview

The File Upload Service provides a comprehensive solution for handling file uploads with support for multiple storage providers, file validation, image processing, and more.

## Features

- **Multiple Storage Providers**: Support for Local Storage, AWS S3, and DigitalOcean Spaces
- **File Validation**: Size limits, file type validation, and content verification
- **Image Processing**: Automatic resizing, compression, format conversion, and thumbnail generation
- **Middleware Integration**: Easy-to-use Express middleware with multer
- **Security**: File type validation, size limits, and user-based access control
- **Scalability**: Seamless switching between storage providers

## Storage Providers

### Local Storage (Development)
- Files are stored on the local file system
- Served via Express static middleware
- Ideal for development and testing

### AWS S3
- Production-ready cloud storage
- Support for public/private files
- CDN integration support
- Scalable and reliable

### DigitalOcean Spaces
- S3-compatible object storage
- Cost-effective alternative to AWS S3
- Built-in CDN support
- Same API as S3

## Configuration

### Environment Variables

```env
# Storage Provider Selection
STORAGE_PROVIDER=local # Options: local, s3, spaces

# Local Storage
LOCAL_STORAGE_PATH=uploads
LOCAL_STORAGE_BASE_URL=http://localhost:3000

# AWS S3
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_DEFAULT_ACL=private # Options: private, public-read
S3_CDN_URL=https://cdn.yourdomain.com # Optional

# DigitalOcean Spaces
SPACES_BUCKET=your-space-name
SPACES_REGION=nyc3
SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
SPACES_ACCESS_KEY_ID=your_access_key
SPACES_SECRET_ACCESS_KEY=your_secret_key
SPACES_DEFAULT_ACL=private
SPACES_CDN_URL=https://your-space.cdn.digitaloceanspaces.com
```

## API Endpoints

### Upload Single File
```
POST /api/v1/upload/single
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- file: <file>

Response:
{
  "success": true,
  "data": {
    "key": "users/123/file-name.jpg",
    "url": "https://storage.example.com/users/123/file-name.jpg",
    "size": 102400,
    "contentType": "image/jpeg",
    "originalName": "photo.jpg",
    "thumbnail": {
      "key": "users/123/file-name-thumb.jpg",
      "url": "https://storage.example.com/users/123/file-name-thumb.jpg"
    }
  }
}
```

### Upload Multiple Files
```
POST /api/v1/upload/multiple
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- files: <file1>
- files: <file2>
- files: <file3>

Response:
{
  "success": true,
  "data": [
    { /* file 1 data */ },
    { /* file 2 data */ },
    { /* file 3 data */ }
  ]
}
```

### Upload Avatar
```
POST /api/v1/upload/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- avatar: <image file>

Response:
{
  "success": true,
  "data": {
    "key": "avatars/123/avatar.webp",
    "url": "https://storage.example.com/avatars/123/avatar.webp",
    "thumbnail": {
      "key": "avatars/123/avatar-thumb.webp",
      "url": "https://storage.example.com/avatars/123/avatar-thumb.webp"
    }
  }
}
```

### Delete File
```
DELETE /api/v1/upload/:key
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "File deleted successfully"
}
```

### List Files
```
GET /api/v1/upload/list?prefix=documents&maxKeys=20
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "files": [
      {
        "key": "users/123/documents/file1.pdf",
        "size": 1048576,
        "lastModified": "2024-01-01T00:00:00.000Z"
      }
    ],
    "nextContinuationToken": "token123",
    "isTruncated": true
  }
}
```

## Usage Examples

### Basic File Upload

```typescript
import { uploadSingle } from '@middlewares/upload';
import { fileUploadService } from '@services/storage';

router.post('/upload',
  authenticate,
  uploadSingle({
    fieldName: 'file',
    allowedCategories: ['image', 'document'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  }),
  async (req, res) => {
    const fileInfo = req.fileInfo;
    
    const result = await fileUploadService.uploadFile(
      fileInfo.buffer,
      fileInfo.originalName,
      {
        folder: `users/${req.user.id}`,
        generateUniqueName: true,
      }
    );
    
    res.json({ success: true, data: result });
  }
);
```

### Image Upload with Processing

```typescript
const result = await fileUploadService.uploadFile(
  buffer,
  'photo.jpg',
  {
    folder: 'products',
    imageProcessing: {
      resize: {
        width: 800,
        height: 600,
        fit: 'cover',
      },
      format: 'webp',
      quality: 85,
      thumbnail: {
        width: 200,
        height: 200,
        suffix: 'thumb',
      },
    },
  }
);
```

### Custom Validation

```typescript
uploadSingle({
  fieldName: 'document',
  allowedMimeTypes: ['application/pdf', 'application/msword'],
  maxFileSize: 25 * 1024 * 1024, // 25MB
  validation: {
    validateContent: true, // Check file magic bytes
  },
})
```

## File Type Categories

The service includes predefined file type categories:

- **image**: JPEG, PNG, GIF, WebP, SVG, AVIF
- **document**: PDF, Word, Excel, PowerPoint, Text, CSV
- **video**: MP4, MPEG, QuickTime, AVI, WMV, WebM
- **audio**: MP3, WAV, OGG, WebM
- **archive**: ZIP, RAR, 7Z, TAR, GZIP

## Image Processing Options

When uploading images, you can specify processing options:

```typescript
{
  resize: {
    width: 1200,
    height: 800,
    fit: 'inside', // Options: cover, contain, fill, inside, outside
    position: 'center', // Options: top, right, bottom, left, center, etc.
  },
  format: 'webp', // Options: jpeg, png, webp, avif
  quality: 85, // 1-100
  stripMetadata: true, // Remove EXIF data
  thumbnail: {
    width: 200,
    height: 200,
    suffix: 'thumb',
  },
}
```

## Security Considerations

1. **File Type Validation**: Always validate file types both by extension and content
2. **Size Limits**: Implement appropriate size limits based on file types
3. **User Isolation**: Store user files in separate folders
4. **Access Control**: Implement proper authorization for file access/deletion
5. **Virus Scanning**: Consider integrating virus scanning for production
6. **Rate Limiting**: Apply rate limits to upload endpoints

## Error Handling

The service handles various error scenarios:

- File too large
- Invalid file type
- Storage provider errors
- Network errors
- Processing errors

All errors are properly logged and return appropriate HTTP status codes.

## Performance Tips

1. **Use CDN**: Configure CDN URLs for public files
2. **Enable Caching**: Set appropriate cache headers
3. **Process Images Asynchronously**: For heavy processing, consider background jobs
4. **Use Streams**: For large files, consider streaming uploads
5. **Monitor Storage**: Implement storage quota monitoring

## Migration Between Providers

To migrate from one storage provider to another:

1. Update the `STORAGE_PROVIDER` environment variable
2. Configure the new provider's credentials
3. Use the service's copy functionality to migrate existing files
4. Update any hardcoded URLs in your database

## Troubleshooting

### Common Issues

1. **"File type not allowed"**: Check allowed MIME types in middleware configuration
2. **"File too large"**: Increase `maxFileSize` in middleware configuration
3. **"Storage provider not initialized"**: Check provider credentials and network connectivity
4. **"Access denied"**: Verify S3/Spaces bucket permissions and ACL settings

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

This will log detailed information about file uploads, processing, and storage operations.