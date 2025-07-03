import Joi from 'joi';
import { CONSTANTS } from '@config/constants';

// Common validation schemas
export const commonSchemas = {
  id: Joi.number().integer().positive(),
  email: Joi.string().email().trim().lowercase(),
  password: Joi.string()
    .min(CONSTANTS.PASSWORD_MIN_LENGTH)
    .pattern(CONSTANTS.PASSWORD_REGEX)
    .message(
      'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  name: Joi.string().trim().min(1).max(100),
  pagination: {
    page: Joi.number().integer().min(1).default(CONSTANTS.DEFAULT_PAGE),
    pageSize: Joi.number()
      .integer()
      .min(1)
      .max(CONSTANTS.MAX_PAGE_SIZE)
      .default(CONSTANTS.DEFAULT_PAGE_SIZE),
    sortBy: Joi.string().trim(),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('ASC'),
  },
};

// Auth validation schemas
export const authValidation = {
  register: Joi.object({
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
    firstName: commonSchemas.name.required(),
    lastName: commonSchemas.name.required(),
  }),

  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().optional().allow(''),
  }),

  forgotPassword: Joi.object({
    email: commonSchemas.email.required(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: commonSchemas.password.required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password.required(),
  }),

  resendVerificationEmail: Joi.object({
    email: commonSchemas.email.required(),
  }),
};

// User validation schemas
export const userValidation = {
  updateProfile: Joi.object({
    firstName: commonSchemas.name,
    lastName: commonSchemas.name,
  }).min(1),

  updateEmail: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required(),
  }),

  getUserById: Joi.object({
    id: commonSchemas.id.required(),
  }),

  getUsers: Joi.object({
    ...commonSchemas.pagination,
    role: Joi.string().valid(...Object.values(CONSTANTS.USER_ROLES)),
    isActive: Joi.boolean(),
    emailVerified: Joi.boolean(),
  }),
};

// Outlet validation schemas
export const outletValidation = {
  create: Joi.object({
    name: Joi.string().trim().min(1).max(255).required(),
    location: Joi.string().trim().min(1).required(),
    contactPhone: Joi.string().trim().min(10).max(20).required(),
    contactEmail: commonSchemas.email.required(),
    managerId: commonSchemas.id.optional(),
  }),

  update: Joi.object({
    name: Joi.string().trim().min(1).max(255).optional(),
    location: Joi.string().trim().min(1).optional(),
    contactPhone: Joi.string().trim().min(10).max(20).optional(),
    contactEmail: commonSchemas.email.optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    managerId: commonSchemas.id.optional().allow(null),
  }),

  query: Joi.object({
    status: Joi.string().valid('active', 'inactive').optional(),
    ...commonSchemas.pagination,
  }),
};

// Cylinder validation schemas
export const cylinderValidation = {
  create: Joi.object({
    cylinderCode: Joi.string().trim().min(1).max(50).required(),
    type: Joi.string().valid('5kg', '10kg', '15kg', '50kg').required(),
    currentOutletId: commonSchemas.id.required(),
    manufactureDate: Joi.date().optional(),
    lastInspectionDate: Joi.date().optional(),
    maxGasVolume: Joi.number().positive().required(),
    currentGasVolume: Joi.number().min(0).optional(),
  }),

  update: Joi.object({
    type: Joi.string().valid('5kg', '10kg', '15kg', '50kg').optional(),
    status: Joi.string().valid('available', 'leased', 'refilling', 'damaged', 'retired').optional(),
    currentOutletId: commonSchemas.id.optional(),
    lastInspectionDate: Joi.date().optional(),
    currentGasVolume: Joi.number().min(0).optional(),
  }),

  bulkCreate: Joi.object({
    cylinders: Joi.array().items(
      Joi.object({
        cylinderCode: Joi.string().trim().min(1).max(50).required(),
        type: Joi.string().valid('5kg', '10kg', '15kg', '50kg').required(),
        currentOutletId: commonSchemas.id.required(),
        manufactureDate: Joi.date().optional(),
        maxGasVolume: Joi.number().positive().required(),
      })
    ).min(1).required(),
  }),

  retire: Joi.object({
    reason: Joi.string().trim().min(1).required(),
  }),

  transfer: Joi.object({
    toOutletId: commonSchemas.id.required(),
    reason: Joi.string().trim().min(1).max(255).optional(),
    notes: Joi.string().trim().max(500).optional(),
  }),

  search: Joi.object({
    outletId: commonSchemas.id.optional(),
    status: Joi.string().valid('available', 'leased', 'refilling', 'damaged', 'retired').optional(),
    type: Joi.string().valid('5kg', '10kg', '15kg', '50kg').optional(),
    searchTerm: Joi.string().trim().optional(),
    ...commonSchemas.pagination,
  }),
};

// Lease validation schemas
export const leaseValidation = {
  create: Joi.object({
    cylinderId: commonSchemas.id.optional(),
    cylinderCode: Joi.string().trim().optional(),
    qrCode: Joi.string().trim().optional(),
    customerId: commonSchemas.id.required(),
    expectedReturnDate: Joi.date().greater('now').optional(),
    depositAmount: Joi.number().min(0).required(),
    leaseAmount: Joi.number().min(0).required(),
    notes: Joi.string().trim().optional(),
  }).or('cylinderId', 'cylinderCode', 'qrCode'),

  return: Joi.object({
    leaseId: commonSchemas.id.required(),
    refundAmount: Joi.number().min(0).required(),
    condition: Joi.string().valid('good', 'damaged', 'needs_inspection').default('good'),
    gasRemaining: Joi.number().min(0).optional(),
    damageNotes: Joi.string().trim().max(500).optional(),
    notes: Joi.string().trim().optional(),
  }),

  query: Joi.object({
    cylinderId: commonSchemas.id.optional(),
    customerId: commonSchemas.id.optional(),
    outletId: commonSchemas.id.optional(),
    status: Joi.string().valid('active', 'returned', 'overdue').optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    ...commonSchemas.pagination,
  }),
};

// Refill validation schemas
export const refillValidation = {
  create: Joi.object({
    cylinderId: commonSchemas.id.required(),
    preRefillVolume: Joi.number().min(0).required(),
    postRefillVolume: Joi.number().min(0).required(),
    refillCost: Joi.number().min(0).optional(),
    notes: Joi.string().trim().optional(),
    batchNumber: Joi.string().trim().max(100).optional(),
  }),

  bulkRefill: Joi.object({
    batchNumber: Joi.string().trim().max(100).required(),
    refills: Joi.array().items(
      Joi.object({
        cylinderCode: Joi.string().trim().min(1).max(50).required(),
        preRefillVolume: Joi.number().min(0).required(),
        postRefillVolume: Joi.number().min(0).required(),
        refillCost: Joi.number().min(0).optional(),
      })
    ).min(1).required(),
    notes: Joi.string().trim().optional(),
  }),

  query: Joi.object({
    operatorId: commonSchemas.id.optional(),
    cylinderId: commonSchemas.id.optional(),
    outletId: commonSchemas.id.optional(),
    batchNumber: Joi.string().trim().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    ...commonSchemas.pagination,
  }),
};

// Customer validation schemas
export const customerValidation = {
  register: Joi.object({
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
    firstName: commonSchemas.name.required(),
    lastName: commonSchemas.name.required(),
    outletId: commonSchemas.id.optional(),
  }),

  activate: Joi.object({
    userId: commonSchemas.id.required(),
    paymentReference: Joi.string().trim().required(),
  }),

  search: Joi.object({
    searchTerm: Joi.string().trim().optional(),
    outletId: commonSchemas.id.optional(),
    paymentStatus: Joi.string().valid('pending', 'active', 'inactive').optional(),
    hasActiveLeases: Joi.boolean().optional(),
    ...commonSchemas.pagination,
  }),

  deactivate: Joi.object({
    reason: Joi.string().trim().min(1).required(),
  }),
};

// QR Code validation schemas
export const qrValidation = {
  bulkGenerate: Joi.object({
    cylinderIds: Joi.array().items(commonSchemas.id).min(1).max(100).required(),
  }),

  validate: Joi.object({
    qrData: Joi.string().trim().required(),
  }),

  download: Joi.object({
    format: Joi.string().valid('png', 'svg').optional(),
  }),
};

// Analytics validation schemas
export const analyticsValidation = {
  dashboard: Joi.object({
    outletId: commonSchemas.id.optional(),
  }),

  dateRange: Joi.object({
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
  }),

  revenue: Joi.object({
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').optional(),
    dateFrom: Joi.date().required(),
    dateTo: Joi.date().required(),
    outletId: commonSchemas.id.optional(),
  }),

  export: Joi.object({
    type: Joi.string().valid('dashboard', 'revenue', 'customers', 'cylinders', 'operators').required(),
    format: Joi.string().valid('csv', 'excel').optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    outletId: commonSchemas.id.optional(),
  }),
};

// Validation helper function
export const validateRequest = <T>(
  data: any,
  schema: Joi.ObjectSchema<T>
): { value: T; error?: Joi.ValidationError } => {
  const { value, error } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  return { value: value as T, error };
};

// Format Joi validation errors
export const formatJoiErrors = (error: Joi.ValidationError): Record<string, string[]> => {
  const errors: Record<string, string[]> = {};

  error.details.forEach((detail) => {
    const field = detail.path.join('.');
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(detail.message);
  });

  return errors;
};