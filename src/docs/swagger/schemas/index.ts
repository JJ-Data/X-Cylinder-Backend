import { OpenAPIV3_1 } from 'openapi-types';
import { commonSchemas } from './common.schemas';
import { authSchemas } from './auth.schemas';
import { userSchemas } from './user.schemas';
import { uploadSchemas } from './upload.schemas';
import { outletSchemas } from './outlet.schemas';
import { cylinderSchemas } from './cylinder.schemas';
import { leaseSchemas } from './lease.schemas';
import { refillSchemas } from './refill.schemas';
import { customerSchemas } from './customer.schemas';
import { qrSchemas } from './qr.schemas';
import { analyticsSchemas } from './analytics.schemas';

export const schemas: Record<string, OpenAPIV3_1.SchemaObject> = {
  ...commonSchemas,
  ...authSchemas,
  ...userSchemas,
  ...uploadSchemas,
  ...outletSchemas,
  ...cylinderSchemas,
  ...leaseSchemas,
  ...refillSchemas,
  ...customerSchemas,
  ...qrSchemas,
  ...analyticsSchemas,
};
