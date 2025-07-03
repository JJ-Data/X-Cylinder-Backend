import { OpenAPIV3_1 } from 'openapi-types';

export class PathBuilderEnhanced {
  private operation: OpenAPIV3_1.OperationObject = {
    responses: {},
  };

  /**
   * Set the endpoint operation ID and tag
   */
  endpoint(operationId: string, tag: string): PathBuilderEnhanced {
    this.operation.operationId = operationId;
    this.operation.tags = [tag];
    return this;
  }

  /**
   * Set the operation summary
   */
  summary(summary: string): PathBuilderEnhanced {
    this.operation.summary = summary;
    return this;
  }

  /**
   * Set the operation description
   */
  description(description: string): PathBuilderEnhanced {
    this.operation.description = description;
    return this;
  }

  /**
   * Add a path parameter
   */
  path(name: string, type: string, description: string): PathBuilderEnhanced {
    if (!this.operation.parameters) {
      this.operation.parameters = [];
    }

    const schema: OpenAPIV3_1.SchemaObject = { type: type as any };

    this.operation.parameters.push({
      name,
      in: 'path',
      required: true,
      description,
      schema: schema as any,
    });

    return this;
  }

  /**
   * Alias for path method (for backward compatibility)
   */
  param(name: string, type: string, description: string): PathBuilderEnhanced {
    return this.path(name, type, description);
  }

  /**
   * Add a query parameter
   */
  query(
    name: string,
    type: string,
    required: boolean = false,
    description?: string
  ): PathBuilderEnhanced {
    if (!this.operation.parameters) {
      this.operation.parameters = [];
    }

    const schema: OpenAPIV3_1.SchemaObject = { type: type as any };

    this.operation.parameters.push({
      name,
      in: 'query',
      required,
      description: description || `${name} parameter`,
      schema: schema as any,
    });

    return this;
  }

  /**
   * Add a request body
   */
  body(schemaRef: string, required: boolean = true): PathBuilderEnhanced {
    this.operation.requestBody = {
      required,
      content: {
        'application/json': {
          schema: {
            $ref: `#/components/schemas/${schemaRef}`,
          },
        },
      },
    };

    return this;
  }

  /**
   * Add a response
   */
  response(status: number | string, schemaRef: string, description?: string): PathBuilderEnhanced {
    const statusCode = status.toString();

    if (schemaRef === 'file') {
      // Special case for file responses
      this.operation.responses![statusCode] = {
        description: description || 'File response',
        content: {
          'application/octet-stream': {
            schema: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      };
    } else if (schemaRef === 'Error' || schemaRef.toLowerCase().includes('error')) {
      // Error response with reference to error schema
      this.operation.responses![statusCode] = {
        description: description || 'Error response',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      };
    } else {
      // Normal schema reference
      this.operation.responses![statusCode] = {
        description: description || `${schemaRef} response`,
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/${schemaRef}`,
            },
          },
        },
      };
    }

    return this;
  }

  /**
   * Set security requirements
   */
  security(
    requirements: OpenAPIV3_1.SecurityRequirementObject[] | boolean = []
  ): PathBuilderEnhanced {
    if (typeof requirements === 'boolean') {
      // If false, no security. If true, use default bearer auth
      this.operation.security = requirements ? [{ BearerAuth: [] }] : [];
    } else {
      this.operation.security = requirements;
    }
    return this;
  }

  /**
   * Set no authentication required (alias for security([]))
   */
  noAuth(): PathBuilderEnhanced {
    this.operation.security = [];
    return this;
  }

  /**
   * Add a file upload request body
   */
  fileUpload(required: boolean = true): PathBuilderEnhanced {
    this.operation.requestBody = {
      required,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                format: 'binary',
              },
            },
          },
        },
      },
    };
    return this;
  }

  /**
   * Add a multiple files upload request body
   */
  multipleFiles(required: boolean = true): PathBuilderEnhanced {
    this.operation.requestBody = {
      required,
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
              },
            },
          },
        },
      },
    };
    return this;
  }

  /**
   * Mark operation as deprecated
   */
  deprecated(isDeprecated: boolean = true): PathBuilderEnhanced {
    this.operation.deprecated = isDeprecated;
    return this;
  }

  /**
   * Build and return the operation object
   */
  build(): OpenAPIV3_1.OperationObject {
    // Reset for next use
    const result = { ...this.operation };
    this.operation = { responses: {} };
    return result;
  }

  /**
   * Create a new instance for chaining
   */
  static create(): PathBuilderEnhanced {
    return new PathBuilderEnhanced();
  }
}
