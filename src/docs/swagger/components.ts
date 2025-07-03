import { OpenAPIV3_1 } from 'openapi-types';

export const components: Omit<OpenAPIV3_1.ComponentsObject, 'schemas'> = {
  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"',
    },
  },
  parameters: {
    // Path parameters
    IdParam: {
      name: 'id',
      in: 'path',
      required: true,
      description: 'The unique identifier of the resource',
      schema: {
        type: 'integer',
        minimum: 1,
        example: 123,
      },
    },
    TokenParam: {
      name: 'token',
      in: 'path',
      required: true,
      description: 'The unique token string',
      schema: {
        type: 'string',
        example: 'abc123def456',
      },
    },
    FileKeyParam: {
      name: 'key',
      in: 'path',
      required: true,
      description: 'The file key/path',
      schema: {
        type: 'string',
        example: 'users/123/documents/file.pdf',
      },
    },
    // Query parameters
    PageParam: {
      name: 'page',
      in: 'query',
      description: 'Page number for pagination',
      schema: {
        type: 'integer',
        minimum: 1,
        default: 1,
        example: 1,
      },
    },
    PageSizeParam: {
      name: 'pageSize',
      in: 'query',
      description: 'Number of items per page',
      schema: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 10,
        example: 10,
      },
    },
    SortByParam: {
      name: 'sortBy',
      in: 'query',
      description: 'Field to sort by',
      schema: {
        type: 'string',
        example: 'createdAt',
      },
    },
    SortOrderParam: {
      name: 'sortOrder',
      in: 'query',
      description: 'Sort order',
      schema: {
        type: 'string',
        enum: ['ASC', 'DESC'],
        default: 'ASC',
        example: 'DESC',
      },
    },
    RoleParam: {
      name: 'role',
      in: 'query',
      description: 'Filter by user role',
      schema: {
        type: 'string',
        enum: ['admin', 'user'],
        example: 'user',
      },
    },
    IsActiveParam: {
      name: 'isActive',
      in: 'query',
      description: 'Filter by active status',
      schema: {
        type: 'boolean',
        example: true,
      },
    },
    EmailVerifiedParam: {
      name: 'emailVerified',
      in: 'query',
      description: 'Filter by email verification status',
      schema: {
        type: 'boolean',
        example: true,
      },
    },
    PrefixParam: {
      name: 'prefix',
      in: 'query',
      description: 'File prefix to filter by',
      schema: {
        type: 'string',
        example: 'documents/',
      },
    },
    MaxKeysParam: {
      name: 'maxKeys',
      in: 'query',
      description: 'Maximum number of files to return',
      schema: {
        type: 'integer',
        minimum: 1,
        maximum: 1000,
        default: 100,
        example: 100,
      },
    },
    ContinuationTokenParam: {
      name: 'continuationToken',
      in: 'query',
      description: 'Token for pagination continuation',
      schema: {
        type: 'string',
        example: 'eyJrZXkiOiJ1c2Vycy8xMjMvZmlsZS5wZGYifQ==',
      },
    },
  },
  responses: {
    UnauthorizedError: {
      description: 'Unauthorized - Invalid or missing authentication token',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse',
          },
          example: {
            success: false,
            error: 'Unauthorized',
            message: 'Invalid or expired token',
          },
        },
      },
    },
    ForbiddenError: {
      description: 'Forbidden - Insufficient permissions',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse',
          },
          example: {
            success: false,
            error: 'Forbidden',
            message: 'Insufficient permissions to access this resource',
          },
        },
      },
    },
    NotFoundError: {
      description: 'Not Found - Resource not found',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse',
          },
          example: {
            success: false,
            error: 'Not Found',
            message: 'Resource not found',
          },
        },
      },
    },
    ValidationError: {
      description: 'Bad Request - Validation error',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ValidationErrorResponse',
          },
          example: {
            success: false,
            error: 'Validation Error',
            message: 'Invalid request data',
            errors: {
              email: ['Email is required', 'Invalid email format'],
              password: ['Password must be at least 8 characters'],
            },
          },
        },
      },
    },
    InternalServerError: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse',
          },
          example: {
            success: false,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
          },
        },
      },
    },
    TooManyRequestsError: {
      description: 'Too Many Requests - Rate limit exceeded',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse',
          },
          example: {
            success: false,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
          },
        },
      },
    },
  },
  requestBodies: {
    FileUpload: {
      description: 'File upload',
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                format: 'binary',
                description: 'The file to upload',
              },
            },
            required: ['file'],
          },
        },
      },
    },
    MultipleFilesUpload: {
      description: 'Multiple files upload',
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              files: {
                type: 'array',
                items: {
                  type: 'string',
                  format: 'binary',
                },
                description: 'The files to upload',
                maxItems: 5,
              },
            },
            required: ['files'],
          },
        },
      },
    },
    AvatarUpload: {
      description: 'Avatar image upload',
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              avatar: {
                type: 'string',
                format: 'binary',
                description: 'The avatar image to upload',
              },
            },
            required: ['avatar'],
          },
        },
      },
    },
  },
  examples: {
    UserExample: {
      value: {
        id: 123,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: '2025-01-20T10:00:00Z',
        lastLogin: '2025-01-21T15:30:00Z',
        createdAt: '2025-01-15T09:00:00Z',
        updatedAt: '2025-01-21T15:30:00Z',
      },
    },
    TokensExample: {
      value: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  },
};