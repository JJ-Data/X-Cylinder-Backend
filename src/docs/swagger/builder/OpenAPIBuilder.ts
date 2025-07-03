import { OpenAPIV3_1 } from 'openapi-types';

export class OpenAPIBuilder {
  private document: OpenAPIV3_1.Document;

  constructor() {
    this.document = {
      openapi: '3.1.0',
      info: {
        title: '',
        version: '1.0.0',
      },
      paths: {},
    };
  }

  setInfo(info: OpenAPIV3_1.InfoObject): OpenAPIBuilder {
    this.document.info = info;
    return this;
  }

  addServer(server: OpenAPIV3_1.ServerObject): OpenAPIBuilder {
    if (!this.document.servers) {
      this.document.servers = [];
    }
    this.document.servers.push(server);
    return this;
  }

  addTag(tag: OpenAPIV3_1.TagObject): OpenAPIBuilder {
    if (!this.document.tags) {
      this.document.tags = [];
    }
    this.document.tags.push(tag);
    return this;
  }

  addPath(path: string, pathItem: OpenAPIV3_1.PathItemObject): OpenAPIBuilder {
    if (!this.document.paths) {
      this.document.paths = {};
    }
    this.document.paths[path] = pathItem;
    return this;
  }

  addPaths(paths: OpenAPIV3_1.PathsObject): OpenAPIBuilder {
    if (!this.document.paths) {
      this.document.paths = {};
    }
    Object.assign(this.document.paths, paths);
    return this;
  }

  setComponents(components: OpenAPIV3_1.ComponentsObject): OpenAPIBuilder {
    this.document.components = components;
    return this;
  }

  addSchema(name: string, schema: OpenAPIV3_1.SchemaObject): OpenAPIBuilder {
    if (!this.document.components) {
      this.document.components = {};
    }
    if (!this.document.components.schemas) {
      this.document.components.schemas = {};
    }
    this.document.components.schemas[name] = schema;
    return this;
  }

  addSecurityScheme(name: string, scheme: OpenAPIV3_1.SecuritySchemeObject): OpenAPIBuilder {
    if (!this.document.components) {
      this.document.components = {};
    }
    if (!this.document.components.securitySchemes) {
      this.document.components.securitySchemes = {};
    }
    this.document.components.securitySchemes[name] = scheme;
    return this;
  }

  setGlobalSecurity(security: OpenAPIV3_1.SecurityRequirementObject[]): OpenAPIBuilder {
    this.document.security = security;
    return this;
  }

  addExternalDocs(externalDocs: OpenAPIV3_1.ExternalDocumentationObject): OpenAPIBuilder {
    this.document.externalDocs = externalDocs;
    return this;
  }

  build(): OpenAPIV3_1.Document {
    return this.document;
  }

  toJSON(): string {
    return JSON.stringify(this.document, null, 2);
  }

  validate(): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!this.document.info.title) {
      errors.push('Info title is required');
    }

    if (!this.document.info.version) {
      errors.push('Info version is required');
    }

    if (!this.document.paths || Object.keys(this.document.paths).length === 0) {
      errors.push('At least one path is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}