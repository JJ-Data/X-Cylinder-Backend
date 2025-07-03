import { OpenAPIV3_1 } from 'openapi-types';

type OperationMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace';

export class PathBuilder {
  private pathItem: OpenAPIV3_1.PathItemObject = {};

  addOperation(
    method: OperationMethod,
    operation: OpenAPIV3_1.OperationObject
  ): PathBuilder {
    (this.pathItem as any)[method] = operation;
    return this;
  }

  addParameter(parameter: OpenAPIV3_1.ParameterObject | OpenAPIV3_1.ReferenceObject): PathBuilder {
    if (!this.pathItem.parameters) {
      this.pathItem.parameters = [];
    }
    this.pathItem.parameters.push(parameter);
    return this;
  }

  setSummary(summary: string): PathBuilder {
    this.pathItem.summary = summary;
    return this;
  }

  setDescription(description: string): PathBuilder {
    this.pathItem.description = description;
    return this;
  }

  build(): OpenAPIV3_1.PathItemObject {
    return this.pathItem;
  }
}

export class OperationBuilder {
  private operation: OpenAPIV3_1.OperationObject = {
    responses: {},
  };

  setSummary(summary: string): OperationBuilder {
    this.operation.summary = summary;
    return this;
  }

  setDescription(description: string): OperationBuilder {
    this.operation.description = description;
    return this;
  }

  setOperationId(operationId: string): OperationBuilder {
    this.operation.operationId = operationId;
    return this;
  }

  addTag(tag: string): OperationBuilder {
    if (!this.operation.tags) {
      this.operation.tags = [];
    }
    this.operation.tags.push(tag);
    return this;
  }

  addParameter(parameter: OpenAPIV3_1.ParameterObject | OpenAPIV3_1.ReferenceObject): OperationBuilder {
    if (!this.operation.parameters) {
      this.operation.parameters = [];
    }
    this.operation.parameters.push(parameter);
    return this;
  }

  setRequestBody(requestBody: OpenAPIV3_1.RequestBodyObject | OpenAPIV3_1.ReferenceObject): OperationBuilder {
    this.operation.requestBody = requestBody;
    return this;
  }

  addResponse(
    statusCode: string,
    response: OpenAPIV3_1.ResponseObject | OpenAPIV3_1.ReferenceObject
  ): OperationBuilder {
    if (!this.operation.responses) {
      this.operation.responses = {};
    }
    this.operation.responses[statusCode] = response;
    return this;
  }

  setSecurity(security: OpenAPIV3_1.SecurityRequirementObject[]): OperationBuilder {
    this.operation.security = security;
    return this;
  }

  setDeprecated(deprecated: boolean): OperationBuilder {
    this.operation.deprecated = deprecated;
    return this;
  }

  build(): OpenAPIV3_1.OperationObject {
    return this.operation;
  }
}