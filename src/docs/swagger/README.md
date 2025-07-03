# Swagger Documentation Architecture

This directory contains a comprehensive TypeScript-based Swagger/OpenAPI documentation system for the CylinderX API.

## Directory Structure

```
src/docs/swagger/
├── index.ts              # Main OpenAPI document configuration
├── components.ts         # Reusable components (security schemes, parameters, responses)
├── schemas/             # TypeScript schema definitions
│   ├── index.ts         # Schema exports aggregator
│   ├── common.schemas.ts # Common/shared schemas
│   ├── auth.schemas.ts   # Authentication-related schemas
│   ├── user.schemas.ts   # User-related schemas
│   └── upload.schemas.ts # File upload schemas
├── paths/               # API path definitions
│   ├── auth.paths.ts    # Authentication endpoints
│   ├── user.paths.ts    # User management endpoints
│   ├── upload.paths.ts  # File upload endpoints
│   └── system.paths.ts  # System endpoints (health check)
└── builder/            # Builder classes for programmatic API doc generation
    ├── index.ts         # Builder exports
    ├── OpenAPIBuilder.ts # Main document builder
    ├── PathBuilder.ts    # Path/operation builder
    ├── SchemaBuilder.ts  # Schema builder
    └── example.usage.ts  # Usage examples

```

## Architecture Features

### 1. Type-Safe Documentation

All documentation is written in TypeScript using the `openapi-types` package, ensuring type safety and IntelliSense support.

### 2. Modular Structure

- **Schemas**: Separated by domain (auth, user, upload, common)
- **Paths**: Organized by route groups matching the actual API structure
- **Components**: Centralized reusable components

### 3. No JSDoc Dependencies

The documentation is completely independent of JSDoc comments in route files, making it easier to maintain and version separately.

### 4. Builder Pattern

Includes builder classes for programmatically generating OpenAPI specifications, useful for:

- Dynamic documentation generation
- Testing documentation validity
- Creating documentation from metadata

## Usage

### Accessing Documentation

Once the server is running, access the Swagger UI at:

```
http://localhost:3000/api-docs
```

### Adding New Endpoints

1. **Define Schema** (if needed):

```typescript
// In schemas/[domain].schemas.ts
export const mySchemas: Record<string, OpenAPIV3_1.SchemaObject> = {
  MyRequest: {
    type: 'object',
    properties: {
      field: { type: 'string' },
    },
    required: ['field'],
  },
};
```

2. **Add Path Definition**:

```typescript
// In paths/[domain].paths.ts
export const myPaths: OpenAPIV3_1.PathsObject = {
  '/my-endpoint': {
    post: {
      tags: ['MyTag'],
      summary: 'My endpoint summary',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/MyRequest' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' },
            },
          },
        },
      },
    },
  },
};
```

3. **Update Index Files**:

- Add schemas to `schemas/index.ts`
- Import and spread paths in main `index.ts`

### Using Builder Classes

```typescript
import { OpenAPIBuilder, SchemaBuilder, PathBuilder } from '@docs/swagger/builder';

const builder = new OpenAPIBuilder();

// Build schema
const schema = new SchemaBuilder()
  .setType('object')
  .addProperty('id', { type: 'integer' })
  .setRequired(['id'])
  .build();

// Build path
const path = new PathBuilder()
  .addOperation('get', {
    tags: ['Users'],
    summary: 'Get user',
    responses: { '200': { description: 'Success' } },
  })
  .build();

// Add to document
builder
  .setInfo({ title: 'My API', version: '1.0.0' })
  .addSchema('User', schema)
  .addPath('/users/{id}', path);

const doc = builder.build();
```

## Best Practices

1. **Consistency**: Use the same naming conventions as the actual API
2. **Completeness**: Document all possible responses, including errors
3. **Examples**: Provide realistic examples in schemas
4. **Descriptions**: Add clear descriptions for all fields and endpoints
5. **Validation**: Use the builder's `validate()` method to check documentation

## Common Components

### Security Schemes

- `BearerAuth`: JWT authentication

### Reusable Parameters

- `IdParam`: Resource ID path parameter
- `PageParam`, `PageSizeParam`: Pagination
- `SortByParam`, `SortOrderParam`: Sorting
- `TokenParam`: Token path parameter

### Standard Responses

- `UnauthorizedError`: 401 responses
- `ForbiddenError`: 403 responses
- `NotFoundError`: 404 responses
- `ValidationError`: 400 validation errors
- `InternalServerError`: 500 errors

## Extending the Documentation

To add new features:

1. **New Domain**: Create new schema and path files
2. **New Component**: Add to `components.ts`
3. **New Builder**: Create in `builder/` directory
4. **Custom UI**: Modify Swagger UI config in `app.ts`

## Maintenance

- Keep documentation in sync with actual API implementation
- Review and update examples regularly
- Use TypeScript's type checking to catch documentation errors
- Consider generating parts of documentation from route metadata
