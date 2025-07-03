import { SchemaBuilder } from '../builder/SchemaBuilder';
import { exportSchemas } from '../builder/schemaExportHelper';

const sb = new SchemaBuilder();

// Base response schemas
const BaseResponseSchema = sb
  .object('BaseResponse', {
    success: sb.boolean('Indicates if the request was successful').example(true),
    message: sb.string('Response message').example('Operation completed successfully'),
  })
  .required(['success']);

const SuccessResponseSchema = sb.object('SuccessResponse', {
  success: sb.boolean('Indicates if the request was successful').example(true),
  message: sb.string('Response message').example('Operation completed successfully'),
  data: sb.string('Response data').optional(),
});

const ErrorResponseSchema = sb
  .object('ErrorResponse', {
    success: sb.boolean('Indicates if the request was successful').example(false),
    message: sb.string('Response message').example('An error occurred'),
    error: sb.string('Error type').example('Validation Error'),
  })
  .required(['success', 'message', 'error']);

const ValidationErrorResponseSchema = sb
  .object('ValidationErrorResponse', {
    success: sb.boolean('Indicates if the request was successful').example(false),
    message: sb.string('Response message').example('Validation failed'),
    error: sb.string('Error type').example('Validation Error'),
    errors: sb
      .object('ValidationErrors', {})
      .additionalProperties(sb.array(sb.string()).description('Field validation errors'))
      .example({
        email: ['Email is required', 'Invalid email format'],
        password: ['Password must be at least 8 characters'],
      }),
  })
  .required(['success', 'message', 'error']);

// Pagination schemas
const PaginationMetaSchema = sb
  .object('PaginationMeta', {
    page: sb.integer('Current page number').example(1),
    pageSize: sb.integer('Number of items per page').example(10),
    totalItems: sb.integer('Total number of items').example(100),
    totalPages: sb.integer('Total number of pages').example(10),
    hasNextPage: sb.boolean('Indicates if there is a next page').example(true),
    hasPreviousPage: sb.boolean('Indicates if there is a previous page').example(false),
  })
  .required(['page', 'pageSize', 'totalItems', 'totalPages', 'hasNextPage', 'hasPreviousPage']);

const PaginatedResponseSchema = sb
  .object('PaginatedResponse', {
    success: sb.boolean('Indicates if the request was successful').example(true),
    message: sb.string('Response message').example('Data retrieved successfully'),
    data: sb
      .object('PaginatedData', {
        items: sb.array(sb.string()).description('Array of items'),
        meta: PaginationMetaSchema,
      })
      .required(['items', 'meta']),
  })
  .required(['success', 'data']);

// Common field schemas
const IdSchema = sb.integer('Unique identifier').min(1).example(123);

const EmailSchema = sb.string('Email address').format('email').example('user@example.com');

const PasswordSchema = sb
  .string(
    'Password (min 8 chars, must contain uppercase, lowercase, number, and special character)'
  )
  .format('password')
  .min(8)
  .example('SecureP@ss123');

const NameSchema = sb.string('Name field').min(1).max(100).example('John');

const DateTimeSchema = sb
  .string('ISO 8601 date-time string')
  .format('date-time')
  .example('2025-01-21T15:30:00Z');

const UserRoleSchema = sb
  .enum(
    ['admin', 'customer', 'staff', 'refill_operator'],
    'CylinderX user role - admin: system administrator, customer: gas cylinder customer, staff: outlet staff member, refill_operator: cylinder refill personnel'
  )
  .example('customer');

const PaymentStatusSchema = sb
  .enum(['pending', 'active', 'inactive'], 'Customer payment verification status')
  .example('pending');

// Collect all schemas
const schemas = {
  BaseResponse: BaseResponseSchema,
  SuccessResponse: SuccessResponseSchema,
  ErrorResponse: ErrorResponseSchema,
  ValidationErrorResponse: ValidationErrorResponseSchema,
  PaginationMeta: PaginationMetaSchema,
  PaginatedResponse: PaginatedResponseSchema,
  Id: IdSchema,
  Email: EmailSchema,
  Password: PasswordSchema,
  Name: NameSchema,
  DateTime: DateTimeSchema,
  UserRole: UserRoleSchema,
  PaymentStatus: PaymentStatusSchema,
};

// Export all schemas as a single object for consistency with other schema files
export const commonSchemas = exportSchemas(schemas);
