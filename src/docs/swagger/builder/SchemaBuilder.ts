import { OpenAPIV3_1 } from 'openapi-types';
import { SchemaBuilderEnhanced } from './SchemaBuilderEnhanced';

// Export a modified version that supports the singleton pattern used in schema files
export class SchemaBuilder {
  /**
   * Create an object schema
   */
  object(name: string, properties?: Record<string, SchemaBuilderEnhanced>): SchemaBuilderEnhanced {
    return new SchemaBuilderEnhanced().object(name, properties);
  }

  /**
   * Create a string schema
   */
  string(description?: string): SchemaBuilderEnhanced {
    return new SchemaBuilderEnhanced().string(description);
  }

  /**
   * Create an integer schema
   */
  integer(description?: string): SchemaBuilderEnhanced {
    return new SchemaBuilderEnhanced().integer(description);
  }

  /**
   * Create a number schema
   */
  number(description?: string): SchemaBuilderEnhanced {
    return new SchemaBuilderEnhanced().number(description);
  }

  /**
   * Create a boolean schema
   */
  boolean(description?: string): SchemaBuilderEnhanced {
    return new SchemaBuilderEnhanced().boolean(description);
  }

  /**
   * Create an array schema
   */
  array(items: SchemaBuilderEnhanced | OpenAPIV3_1.SchemaObject): SchemaBuilderEnhanced {
    return new SchemaBuilderEnhanced().array(items);
  }

  /**
   * Create an enum schema
   */
  enum(values: string[], description?: string): SchemaBuilderEnhanced {
    return new SchemaBuilderEnhanced().enum(values, description);
  }

  /**
   * Create a reference to another schema
   */
  static ref(schemaName: string): OpenAPIV3_1.ReferenceObject {
    return SchemaBuilderEnhanced.ref(schemaName);
  }

  // Keep the original static methods for compatibility
  static object(): SchemaBuilder {
    const builder = new SchemaBuilder();
    return builder;
  }

  static array(): SchemaBuilder {
    return new SchemaBuilder();
  }

  static string(): SchemaBuilder {
    return new SchemaBuilder();
  }

  static number(): SchemaBuilder {
    return new SchemaBuilder();
  }

  static integer(): SchemaBuilder {
    return new SchemaBuilder();
  }

  static boolean(): SchemaBuilder {
    return new SchemaBuilder();
  }
}
