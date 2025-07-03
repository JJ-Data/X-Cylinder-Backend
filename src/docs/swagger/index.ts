import { OpenAPIV3_1 } from 'openapi-types';
import { config } from '@config/environment';
import { CONSTANTS } from '@config/constants';
import { authPaths } from './paths/auth.paths';
import { userPaths } from './paths/user.paths';
import { uploadPaths } from './paths/upload.paths';
import { systemPaths } from './paths/system.paths';
import { outletPaths } from './paths/outlet.paths';
import { cylinderPaths } from './paths/cylinder.paths';
import { leasePaths } from './paths/lease.paths';
import { refillPaths } from './paths/refill.paths';
import { customerPaths } from './paths/customer.paths';
import { qrPaths } from './paths/qr.paths';
import { analyticsPaths } from './paths/analytics.paths';
import { components } from './components';
import { schemas } from './schemas';

export const openApiDocument: OpenAPIV3_1.Document = {
  openapi: '3.1.0',
  info: {
    title: 'CylinderX API',
    version: '1.0.0',
    description: 'RESTful API for CylinderX gas cylinder leasing and refill management platform',
    contact: {
      name: 'API Support',
      email: 'support@cylinderx.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `${config.isDevelopment ? 'http' : 'https'}://localhost:${config.port}${CONSTANTS.API_PREFIX}/${CONSTANTS.API_VERSION}`,
      description: config.isDevelopment ? 'Development server' : 'Production server',
    },
  ],
  tags: [
    {
      name: 'System',
      description: 'System endpoints for health checks and monitoring',
    },
    {
      name: 'Authentication',
      description: 'Authentication endpoints including login, register, password reset, and email verification',
    },
    {
      name: 'Users',
      description: 'User management endpoints for profile and admin operations',
    },
    {
      name: 'Upload',
      description: 'File upload and management endpoints',
    },
    {
      name: 'Outlets',
      description: 'Outlet management endpoints for gas company branches',
    },
    {
      name: 'Cylinders',
      description: 'Gas cylinder management and tracking endpoints',
    },
    {
      name: 'Leases',
      description: 'Cylinder leasing and return management endpoints',
    },
    {
      name: 'Refills',
      description: 'Cylinder refill tracking and management endpoints',
    },
    {
      name: 'Customers',
      description: 'Customer registration and management endpoints',
    },
    {
      name: 'QR',
      description: 'QR code generation and validation endpoints',
    },
    {
      name: 'Analytics',
      description: 'Analytics and reporting endpoints for business insights',
    },
  ],
  paths: {
    ...systemPaths,
    ...authPaths,
    ...userPaths,
    ...uploadPaths,
    ...outletPaths,
    ...cylinderPaths,
    ...leasePaths,
    ...refillPaths,
    ...customerPaths,
    ...qrPaths,
    ...analyticsPaths,
  } as OpenAPIV3_1.PathsObject,
  components: {
    schemas,
    ...components,
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
};

export default openApiDocument;