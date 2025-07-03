import { OpenAPIV3_1 } from 'openapi-types';

export class SchemaBuilder {
  private schema: OpenAPIV3_1.SchemaObject = {};

  setType(type: OpenAPIV3_1.NonArraySchemaObjectType | 'array'): SchemaBuilder {
    this.schema.type = type;
    return this;
  }

  setFormat(format: string): SchemaBuilder {
    this.schema.format = format;
    return this;
  }

  setTitle(title: string): SchemaBuilder {
    this.schema.title = title;
    return this;
  }

  setDescription(description: string): SchemaBuilder {
    this.schema.description = description;
    return this;
  }

  setExample(example: any): SchemaBuilder {
    this.schema.example = example;
    return this;
  }

  addExample(example: any): SchemaBuilder {
    // Alias for setExample to match the usage in example.usage.ts
    return this.setExample(example);
  }

  setDefault(defaultValue: any): SchemaBuilder {
    this.schema.default = defaultValue;
    return this;
  }

  setEnum(enumValues: any[]): SchemaBuilder {
    this.schema.enum = enumValues;
    return this;
  }

  setRequired(required: string[]): SchemaBuilder {
    this.schema.required = required;
    return this;
  }

  addProperty(
    name: string,
    property: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject
  ): SchemaBuilder {
    if (!this.schema.properties) {
      this.schema.properties = {};
    }
    this.schema.properties[name] = property;
    return this;
  }

  setItems(items: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject): SchemaBuilder {
    if (this.schema.type === 'array') {
      (this.schema as OpenAPIV3_1.ArraySchemaObject).items = items;
    }
    return this;
  }

  setMinimum(minimum: number): SchemaBuilder {
    this.schema.minimum = minimum;
    return this;
  }

  setMaximum(maximum: number): SchemaBuilder {
    this.schema.maximum = maximum;
    return this;
  }

  setMinLength(minLength: number): SchemaBuilder {
    this.schema.minLength = minLength;
    return this;
  }

  setMaxLength(maxLength: number): SchemaBuilder {
    this.schema.maxLength = maxLength;
    return this;
  }

  setPattern(pattern: string): SchemaBuilder {
    this.schema.pattern = pattern;
    return this;
  }

  setNullable(nullable: boolean): SchemaBuilder {
    // nullable is not part of OpenAPIV3_1, but we keep it for compatibility
    (this.schema as any).nullable = nullable;
    return this;
  }

  setReadOnly(readOnly: boolean): SchemaBuilder {
    this.schema.readOnly = readOnly;
    return this;
  }

  setWriteOnly(writeOnly: boolean): SchemaBuilder {
    this.schema.writeOnly = writeOnly;
    return this;
  }

  setAllOf(schemas: (OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject)[]): SchemaBuilder {
    this.schema.allOf = schemas;
    return this;
  }

  setOneOf(schemas: (OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject)[]): SchemaBuilder {
    this.schema.oneOf = schemas;
    return this;
  }

  setAnyOf(schemas: (OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject)[]): SchemaBuilder {
    this.schema.anyOf = schemas;
    return this;
  }

  setAdditionalProperties(
    additionalProperties: boolean | OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject
  ): SchemaBuilder {
    this.schema.additionalProperties = additionalProperties;
    return this;
  }

  build(): OpenAPIV3_1.SchemaObject {
    return this.schema;
  }

  static ref(ref: string): OpenAPIV3_1.ReferenceObject {
    return { $ref: ref };
  }

  static object(
    properties?: Record<string, OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject>
  ): SchemaBuilder {
    const builder = new SchemaBuilder().setType('object');
    if (properties) {
      Object.entries(properties).forEach(([name, schema]) => {
        builder.addProperty(name, schema);
      });
    }
    return builder;
  }

  static array(items: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject): SchemaBuilder {
    return new SchemaBuilder().setType('array').setItems(items);
  }

  static string(): SchemaBuilder {
    return new SchemaBuilder().setType('string');
  }

  static number(): SchemaBuilder {
    return new SchemaBuilder().setType('number');
  }

  static integer(): SchemaBuilder {
    return new SchemaBuilder().setType('integer');
  }

  static boolean(): SchemaBuilder {
    return new SchemaBuilder().setType('boolean');
  }
}
