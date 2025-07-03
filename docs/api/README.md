# API Documentation

## Overview

The CellerHut Logistics API is a RESTful API that provides comprehensive functionality for logistics management, including user authentication, file management, and various business operations.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

The API uses JWT (JSON Web Token) authentication. Most endpoints require authentication.

### Authentication Flow

1. **Register** or **Login** to receive tokens
2. Include the access token in the `Authorization` header: `Bearer <token>`
3. When the access token expires, use the refresh token to get a new one

### Token Types

- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

## Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

#### Email Verification
```http
GET /auth/verify-email/:token
```

#### Resend Verification Email
```http
POST /auth/resend-verification-email
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token",
  "password": "NewSecurePass123!"
}
```

### User Management

#### Get User Profile
```http
GET /users/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PATCH /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Update Email
```http
PATCH /users/email
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "password": "current-password"
}
```

#### Change Password
```http
PATCH /users/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

### Admin Endpoints

#### List Users (Admin Only)
```http
GET /users?page=1&limit=20&search=john
Authorization: Bearer <admin-token>
```

#### Get User by ID (Admin Only)
```http
GET /users/:id
Authorization: Bearer <admin-token>
```

#### Delete User (Admin Only)
```http
DELETE /users/:id
Authorization: Bearer <admin-token>
```

#### Toggle User Status (Admin Only)
```http
PATCH /users/:id/toggle-status
Authorization: Bearer <admin-token>
```

### File Upload

#### Upload Single File
```http
POST /upload/single
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "users/1/file.jpg",
    "url": "https://storage.example.com/users/1/file.jpg",
    "size": 102400,
    "contentType": "image/jpeg"
  }
}
```

#### Upload Multiple Files
```http
POST /upload/multiple
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: <binary>
files: <binary>
```

#### Upload Avatar
```http
POST /upload/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

avatar: <binary>
```

#### Delete File
```http
DELETE /upload/:key
Authorization: Bearer <token>
```

#### List Files
```http
GET /upload/list?prefix=documents&maxKeys=20
Authorization: Bearer <token>
```

## Request/Response Format

### Request Headers

```http
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json
```

### Standard Response Format

#### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Email is required"
    }
  }
}
```

## Error Handling

### HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `204 No Content` - Request succeeded with no content
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate email)
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `UNAUTHORIZED` - Authentication failed
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per 15 minutes
- **General API endpoints**: 100 requests per 15 minutes
- **File upload endpoints**: 20 requests per 15 minutes

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination:

```http
GET /users?page=1&limit=20&sort=createdAt&order=desc
```

Response includes pagination metadata:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Filtering and Searching

Many endpoints support filtering and searching:

```http
GET /users?search=john&status=active&role=admin
```

## Webhooks

The API supports webhooks for certain events. Configure webhook URLs in your account settings.

### Webhook Events

- `user.created` - New user registered
- `user.verified` - Email verified
- `password.reset` - Password reset completed
- `file.uploaded` - File uploaded successfully

### Webhook Payload

```json
{
  "event": "user.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    // Event-specific data
  }
}
```

## API Versioning

The API uses URL versioning. The current version is `v1`.

```
https://api.example.com/api/v1/...
```

## SDK and Client Libraries

Official SDKs are available for:
- JavaScript/TypeScript
- Python
- PHP
- Ruby

See individual SDK documentation for usage examples.

## Testing

Use the provided Postman collection or explore the interactive Swagger documentation at `/api-docs`.

### Example cURL Commands

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Get Profile
curl http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Support

For API support:
- Check the [FAQ](../faq.md)
- Review [Examples](./examples.md)
- Contact support@cellerhutlogistics.com