import { OpenAPIV3_1 } from 'openapi-types';

export class SchemaBuilderEnhanced {
  private schema: OpenAPIV3_1.SchemaObject = {};
  private isOptional: boolean = false;

  /**
   * Create an object schema
   */
  object(name: string, properties?: Record<string, SchemaBuilderEnhanced>): SchemaBuilderEnhanced {
    const builder = new SchemaBuilderEnhanced();
    builder.schema.type = 'object';
    builder.schema.title = name;

    if (properties) {
      builder.schema.properties = {};
      for (const [key, propBuilder] of Object.entries(properties)) {
        builder.schema.properties[key] = propBuilder.build();
      }
    }

    return builder;
  }

  /**
   * Create a string schema
   */
  string(description?: string): SchemaBuilderEnhanced {
    const builder = new SchemaBuilderEnhanced();
    builder.schema.type = 'string';
    if (description) builder.schema.description = description;
    return builder;
  }

  /**
   * Create an integer schema
   */
  integer(description?: string): SchemaBuilderEnhanced {
    const builder = new SchemaBuilderEnhanced();
    builder.schema.type = 'integer';
    if (description) builder.schema.description = description;
    return builder;
  }

  /**
   * Create a number schema
   */
  number(description?: string): SchemaBuilderEnhanced {
    const builder = new SchemaBuilderEnhanced();
    builder.schema.type = 'number';
    if (description) builder.schema.description = description;
    return builder;
  }

  /**
   * Create a boolean schema
   */
  boolean(description?: string): SchemaBuilderEnhanced {
    const builder = new SchemaBuilderEnhanced();
    builder.schema.type = 'boolean';
    if (description) builder.schema.description = description;
    return builder;
  }

  /**
   * Create an array schema
   */
  array(items: SchemaBuilderEnhanced | OpenAPIV3_1.SchemaObject): SchemaBuilderEnhanced {
    const builder = new SchemaBuilderEnhanced();
    builder.schema.type = 'array';

    // Cast to array schema to access items property
    const arraySchema = builder.schema as OpenAPIV3_1.ArraySchemaObject;

    if (items instanceof SchemaBuilderEnhanced) {
      arraySchema.items = items.build();
    } else {
      arraySchema.items = items;
    }

    return builder;
  }

  /**
   * Create an enum schema
   */
  enum(values: string[], description?: string): SchemaBuilderEnhanced {
    const builder = new SchemaBuilderEnhanced();
    builder.schema.type = 'string';
    builder.schema.enum = values;
    if (description) builder.schema.description = description;
    return builder;
  }

  /**
   * Add an example value
   */
  example(value: any): SchemaBuilderEnhanced {
    this.schema.example = value;
    return this;
  }

  /**
   * Set the format
   */
  format(format: string): SchemaBuilderEnhanced {
    this.schema.format = format;
    return this;
  }

  /**
   * Set minimum length for string schema
   */
  minLength(min: number): SchemaBuilderEnhanced {
    this.schema.minLength = min;
    return this;
  }

  /**
   * Make the schema nullable
   */
  nullable(): SchemaBuilderEnhanced {
    // OpenAPI 3.1 uses type arrays for nullable
    if (this.schema.type && this.schema.type !== 'array') {
      this.schema.type = [this.schema.type, 'null'] as any;
    }
    return this;
  }

  /**
   * Mark as optional (for use in object properties)
   */
  optional(): SchemaBuilderEnhanced {
    this.isOptional = true;
    return this;
  }

  /**
   * Mark as read-only
   */
  readOnly(): SchemaBuilderEnhanced {
    this.schema.readOnly = true;
    return this;
  }

  /**
   * Mark as write-only
   */
  writeOnly(): SchemaBuilderEnhanced {
    this.schema.writeOnly = true;
    return this;
  }

  /**
   * Set required fields for object schema
   */
  required(fields: string[]): SchemaBuilderEnhanced {
    if (this.schema.type === 'object') {
      this.schema.required = fields;
    }
    return this;
  }

  /**
   * Set minimum value/length
   */
  min(value: number): SchemaBuilderEnhanced {
    if (this.schema.type === 'string') {
      this.schema.minLength = value;
    } else if (this.schema.type === 'array') {
      this.schema.minItems = value;
    } else if (this.schema.type === 'number' || this.schema.type === 'integer') {
      this.schema.minimum = value;
    }
    return this;
  }

  /**
   * Set maximum value/length
   */
  max(value: number): SchemaBuilderEnhanced {
    if (this.schema.type === 'string') {
      this.schema.maxLength = value;
    } else if (this.schema.type === 'array') {
      this.schema.maxItems = value;
    } else if (this.schema.type === 'number' || this.schema.type === 'integer') {
      this.schema.maximum = value;
    }
    return this;
  }

  /**
   * Set a pattern for string validation
   */
  pattern(pattern: string): SchemaBuilderEnhanced {
    if (this.schema.type === 'string') {
      this.schema.pattern = pattern;
    }
    return this;
  }

  /**
   * Set additional properties for object schema
   */
  additionalProperties(value: boolean | SchemaBuilderEnhanced): SchemaBuilderEnhanced {
    if (this.schema.type === 'object') {
      if (value instanceof SchemaBuilderEnhanced) {
        this.schema.additionalProperties = value.build();
      } else {
        this.schema.additionalProperties = value;
      }
    }
    return this;
  }

  /**
   * Set a default value
   */
  default(value: any): SchemaBuilderEnhanced {
    this.schema.default = value;
    return this;
  }

  /**
   * Add a description
   */
  description(description: string): SchemaBuilderEnhanced {
    this.schema.description = description;
    return this;
  }

  /**
   * Build and return the schema object
   */
  build(): OpenAPIV3_1.SchemaObject {
    return { ...this.schema };
  }

  /**
   * Check if the schema is marked as optional
   */
  getIsOptional(): boolean {
    return this.isOptional;
  }

  /**
   * Get the properties of an object schema
   */
  get properties(): Record<string, SchemaBuilderEnhanced> {
    if (this.schema.type === 'object' && this.schema.properties) {
      const props: Record<string, SchemaBuilderEnhanced> = {};
      for (const [key, schema] of Object.entries(this.schema.properties)) {
        const builder = new SchemaBuilderEnhanced();
        builder.schema = schema as OpenAPIV3_1.SchemaObject;
        props[key] = builder;
      }
      return props;
    }
    return {};
  }

  /**
   * Create a reference to another schema
   */
  static ref(schemaName: string): OpenAPIV3_1.ReferenceObject {
    return { $ref: `#/components/schemas/${schemaName}` };
  }
}
