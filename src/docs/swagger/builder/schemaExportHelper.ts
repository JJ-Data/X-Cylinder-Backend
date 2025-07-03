import { OpenAPIV3_1 } from 'openapi-types';
import { SchemaBuilderEnhanced } from './SchemaBuilderEnhanced';

/**
 * Helper function to export schemas properly
 * Converts SchemaBuilderEnhanced instances to OpenAPI schema objects
 * Also creates aliases without "Schema" suffix for path file compatibility
 */
export function exportSchemas(
  schemas: Record<string, any>
): Record<string, OpenAPIV3_1.SchemaObject> {
  const result: Record<string, OpenAPIV3_1.SchemaObject> = {};

  for (const [key, value] of Object.entries(schemas)) {
    let builtSchema: OpenAPIV3_1.SchemaObject;

    if (value instanceof SchemaBuilderEnhanced) {
      // If it's a builder, build it
      builtSchema = value.build();
    } else if (
      value &&
      typeof value === 'object' &&
      'build' in value &&
      typeof value.build === 'function'
    ) {
      // If it has a build method, use it
      builtSchema = value.build();
    } else {
      // Otherwise, assume it's already a schema object
      builtSchema = value;
    }

    // Export with original name (with Schema suffix)
    result[key] = builtSchema;

    // Create alias without Schema suffix for path file compatibility
    if (key.endsWith('Schema')) {
      const aliasKey = key.replace(/Schema$/, '');
      result[aliasKey] = builtSchema;
    }
  }

  return result;
}
