import { SchemaBuilder } from '../builder/SchemaBuilder';
import { exportSchemas } from '../builder/schemaExportHelper';

const sb = new SchemaBuilder();

const CustomerSchema = sb.object('Customer', {
  id: sb.integer('Unique identifier').readOnly(),
  email: sb.string('Email address').format('email'),
  firstName: sb.string('First name'),
  lastName: sb.string('Last name'),
  role: sb.string('User role').readOnly(),
  isActive: sb.boolean('Active status'),
  emailVerified: sb.boolean('Email verification status'),
  outletId: sb.integer('Associated outlet ID').nullable(),
  paymentStatus: sb.enum(['pending', 'active', 'inactive'], 'Payment status'),
  activatedAt: sb.string('Activation date').format('date-time').nullable(),
  activeLeases: sb.integer('Number of active leases').readOnly().optional(),
  totalLeases: sb.integer('Total number of leases').readOnly().optional(),
  createdAt: sb.string('Creation timestamp').format('date-time').readOnly(),
  updatedAt: sb.string('Last update timestamp').format('date-time').readOnly(),
});

const RegisterCustomerSchema = sb
  .object('RegisterCustomer', {
    email: sb.string('Email address').format('email').example('customer@example.com'),
    firstName: sb.string('First name').example('John'),
    lastName: sb.string('Last name').example('Doe'),
    phoneNumber: sb.string('Phone number').optional().example('+234 xxx xxx xxxx'),
    alternatePhone: sb.string('Alternate phone number').optional(),
    address: sb.string('Street address').optional().example('123 Main Street'),
    city: sb.string('City').optional().example('Lagos'),
    state: sb.string('State').optional().example('Lagos'),
    postalCode: sb.string('Postal code').optional().example('100001'),
    outletId: sb.integer('Preferred outlet ID').optional(),
  })
  .required(['email', 'firstName', 'lastName']);

const ActivateCustomerSchema = sb
  .object('ActivateCustomer', {
    userId: sb.integer('User ID'),
    paymentAmount: sb.number('Payment amount').min(0).example(5000),
    paymentMethod: sb.enum(['cash', 'bank_transfer', 'card'], 'Payment method').example('cash'),
    paymentReference: sb.string('Payment reference from gateway').optional().example('TXN123456'),
  })
  .required(['userId', 'paymentAmount', 'paymentMethod']);

const DeactivateCustomerSchema = sb
  .object('DeactivateCustomer', {
    reason: sb.string('Reason for deactivation'),
  })
  .required(['reason']);

// Response schemas with proper {success, message, data} wrapper format
const CustomerResponseSchema = sb.object('CustomerResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Customer retrieved successfully'),
  data: CustomerSchema,
});

const CustomerRegistrationResponseSchema = sb.object('CustomerRegistrationResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Customer registered successfully'),
  data: sb.object('CustomerRegistrationData', {
    customer: CustomerSchema,
    paymentLink: sb.object('PaymentLink', {
      userId: sb.integer('User ID'),
      amount: sb.number('Payment amount'),
      paymentLink: sb.string('Payment URL'),
      expiresAt: sb.string('Link expiration').format('date-time'),
    }),
  }),
});

const CustomerListResponseSchema = sb.object('CustomerListResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Customers retrieved successfully'),
  data: sb.object('CustomerListData', {
    customers: sb.array(CustomerSchema),
    total: sb.integer('Total number of customers'),
    page: sb.integer('Current page number'),
    totalPages: sb.integer('Total number of pages'),
  }),
});

// Export all schemas as OpenAPI objects
const schemas = {
  CustomerSchema,
  RegisterCustomerSchema,
  ActivateCustomerSchema,
  DeactivateCustomerSchema,
  CustomerResponseSchema,
  CustomerRegistrationResponseSchema,
  CustomerListResponseSchema,
};

// Export all schemas as a single object for consistency with other schema files
export const customerSchemas = exportSchemas(schemas);
