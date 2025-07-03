# Feature Name

## Overview

Brief description of what this feature does and why it's useful.

## Configuration

### Environment Variables

```env
# Feature-specific environment variables
FEATURE_ENABLED=true
FEATURE_OPTION=value
```

### Configuration Options

Describe any configuration options available for this feature.

## Usage

### Basic Usage

```typescript
// Example code showing basic usage
import { Feature } from '@services/feature';

const result = await Feature.doSomething();
```

### Advanced Usage

```typescript
// More complex examples
```

## API Endpoints

### Endpoint Name

```
METHOD /api/v1/feature/endpoint
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "field": "value"
}

Response:
{
  "success": true,
  "data": {}
}
```

## Models/Database

Describe any database models or schema changes required.

## Middleware

Describe any middleware components if applicable.

## Security Considerations

- List security considerations
- Authentication/Authorization requirements
- Rate limiting
- Input validation

## Error Handling

Common errors and how they're handled:

- `ERROR_CODE`: Description and resolution

## Testing

How to test this feature:

```bash
# Run feature-specific tests
pnpm test -- feature.test.ts
```

## Performance Considerations

- Caching strategies
- Database query optimization
- Resource usage

## Troubleshooting

### Common Issues

1. **Issue**: Description
   - **Solution**: How to resolve

2. **Issue**: Description
   - **Solution**: How to resolve

## Migration Guide

If this feature replaces or updates existing functionality, provide migration steps.

## Examples

### Example 1: Common Use Case

```typescript
// Complete example
```

### Example 2: Integration with Other Features

```typescript
// Example showing integration
```

## Related Documentation

- Link to related features
- Link to API documentation
- Link to architecture decisions