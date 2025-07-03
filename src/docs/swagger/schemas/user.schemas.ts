import { SchemaBuilder } from '../builder/SchemaBuilder';
import { exportSchemas } from '../builder/schemaExportHelper';

const sb = new SchemaBuilder();

// User model schemas
const UserPublicSchema = sb
  .object('UserPublic', {
    id: sb.integer('User ID').example(1),
    email: sb.string('User email').format('email').example('user@example.com'),
    firstName: sb.string('First name').example('John'),
    lastName: sb.string('Last name').example('Doe'),
    role: sb
      .enum(['admin', 'staff', 'customer', 'refill_operator'], 'User role')
      .example('customer'),
    isActive: sb.boolean('User active status').example(true),
    emailVerified: sb.boolean('Email verification status').example(true),
    emailVerifiedAt: sb.string('Email verification timestamp').format('date-time').nullable(),
    lastLogin: sb.string('Last login timestamp').format('date-time').nullable(),
    outletId: sb.integer('Associated outlet ID').nullable(),
    paymentStatus: sb
      .enum(['pending', 'active', 'inactive'], 'Payment status')
      .example('active')
      .nullable(),
    activatedAt: sb.string('Account activation timestamp').format('date-time').nullable(),
    createdAt: sb.string('Creation timestamp').format('date-time'),
    updatedAt: sb.string('Last update timestamp').format('date-time'),
  })
  .required([
    'id',
    'email',
    'firstName',
    'lastName',
    'role',
    'isActive',
    'emailVerified',
    'createdAt',
    'updatedAt',
  ]);

// Request schemas
const UpdateProfileRequestSchema = sb
  .object('UpdateProfileRequest', {
    firstName: sb.string('First name').example('John').optional(),
    lastName: sb.string('Last name').example('Doe').optional(),
  })
  .description('At least one field must be provided');

const UpdateEmailRequestSchema = sb
  .object('UpdateEmailRequest', {
    email: sb.string('New email address').format('email').example('newemail@example.com'),
    password: sb.string('Current password for verification').example('currentpassword123'),
  })
  .required(['email', 'password']);

const ChangePasswordRequestSchema = sb
  .object('ChangePasswordRequest', {
    currentPassword: sb.string('Current password').example('currentpassword123'),
    newPassword: sb.string('New password').example('newpassword123'),
  })
  .required(['currentPassword', 'newPassword']);

// Response schemas
const UserProfileResponseSchema = sb.object('UserProfileResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('User profile retrieved successfully'),
  data: UserPublicSchema,
});

const UsersListResponseSchema = sb.object('UsersListResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Users retrieved successfully'),
  data: sb
    .object('UsersListData', {
      items: sb.array(UserPublicSchema).description('Array of users'),
      meta: sb
        .object('PaginationMeta', {
          page: sb.integer('Current page number').example(1),
          pageSize: sb.integer('Number of items per page').example(10),
          total: sb.integer('Total number of items').example(100),
          totalPages: sb.integer('Total number of pages').example(10),
          hasNextPage: sb.boolean('Indicates if there is a next page').example(true),
          hasPrevPage: sb.boolean('Indicates if there is a previous page').example(false),
        })
        .required(['page', 'pageSize', 'total', 'totalPages', 'hasNextPage', 'hasPrevPage']),
    })
    .required(['items', 'meta']),
});

// Query parameter schemas for filtering
const UserFiltersSchema = sb.object('UserFilters', {
  page: sb.integer('Page number').min(1).default(1).optional(),
  pageSize: sb.integer('Items per page').min(1).max(100).default(10).optional(),
  sortBy: sb.string('Field to sort by').example('createdAt').optional(),
  sortOrder: sb.enum(['ASC', 'DESC'], 'Sort order').default('ASC').optional(),
  role: sb
    .enum(['admin', 'staff', 'customer', 'refill_operator'], 'Filter by user role')
    .optional(),
  isActive: sb.boolean('Filter by active status').optional(),
  emailVerified: sb.boolean('Filter by email verification status').optional(),
  outletId: sb.integer('Filter by outlet ID').optional(),
  paymentStatus: sb.enum(['pending', 'active', 'inactive'], 'Filter by payment status').optional(),
});

// Export all schemas as OpenAPI objects
const schemas = {
  UserPublicSchema,
  UpdateProfileRequestSchema,
  UpdateEmailRequestSchema,
  ChangePasswordRequestSchema,
  UserProfileResponseSchema,
  UsersListResponseSchema,
  UserFiltersSchema,
};

// Export all schemas as a single object for consistency with other schema files
export const userSchemas = exportSchemas(schemas);
