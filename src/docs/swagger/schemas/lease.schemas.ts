import { SchemaBuilder } from '../builder/SchemaBuilder';
import { exportSchemas } from '../builder/schemaExportHelper';

const sb = new SchemaBuilder();

const LeaseRecordSchema = sb
  .object('LeaseRecord', {
    id: sb.integer('Unique identifier').readOnly(),
    cylinderId: sb.integer('Cylinder ID'),
    customerId: sb.integer('Customer ID'),
    outletId: sb.integer('Outlet ID'),
    staffId: sb.integer('Staff ID who created the lease'),
    leaseDate: sb.string('Lease date').format('date-time'),
    expectedReturnDate: sb.string('Expected return date').format('date-time').nullable(),
    actualReturnDate: sb.string('Actual return date').format('date-time').nullable(),
    returnStaffId: sb.integer('Staff ID who processed the return').nullable(),
    leaseStatus: sb.enum(['active', 'returned', 'overdue'], 'Lease status').example('active'),
    depositAmount: sb.number('Deposit amount').example(100),
    leaseAmount: sb.number('Lease amount').example(50),
    refundAmount: sb.number('Refund amount').nullable(),
    notes: sb.string('Additional notes').nullable(),
    createdAt: sb.string('Creation timestamp').format('date-time').readOnly(),
    updatedAt: sb.string('Last update timestamp').format('date-time').readOnly(),
  })
  .required(['cylinderId', 'customerId', 'outletId', 'staffId', 'depositAmount', 'leaseAmount']);

const CreateLeaseSchema = sb
  .object('CreateLease', {
    cylinderId: sb.integer('Cylinder ID'),
    customerId: sb.integer('Customer ID'),
    expectedReturnDate: sb.string('Expected return date').format('date-time').nullable().optional(),
    depositAmount: sb.number('Deposit amount').example(100),
    leaseAmount: sb.number('Lease amount').example(50),
    notes: sb.string('Additional notes').nullable().optional(),
  })
  .required(['cylinderId', 'customerId', 'depositAmount', 'leaseAmount']);

const ReturnCylinderSchema = sb
  .object('ReturnCylinder', {
    leaseId: sb.integer('Lease ID'),
    refundAmount: sb.number('Refund amount').example(90),
    notes: sb.string('Return notes').optional(),
  })
  .required(['leaseId', 'refundAmount']);

// Response schemas with proper {success, message, data} wrapper format
const LeaseResponseSchema = sb.object('LeaseResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Lease retrieved successfully'),
  data: LeaseRecordSchema,
});

const LeaseListResponseSchema = sb.object('LeaseListResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Leases retrieved successfully'),
  data: sb.object('LeaseListData', {
    leases: sb.array(LeaseRecordSchema),
    total: sb.integer('Total number of leases'),
    page: sb.integer('Current page number'),
    totalPages: sb.integer('Total number of pages'),
  }),
});

const LeaseStatisticsSchema = sb.object('LeaseStatistics', {
  totalActive: sb.integer('Total active leases'),
  totalReturned: sb.integer('Total returned leases'),
  totalOverdue: sb.integer('Total overdue leases'),
  averageLeaseDuration: sb.integer('Average lease duration in days'),
  totalRevenue: sb.number('Total revenue from leases'),
  totalDeposits: sb.number('Total deposits retained'),
});

const LeaseStatisticsResponseSchema = sb.object('LeaseStatisticsResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Lease statistics retrieved successfully'),
  data: LeaseStatisticsSchema,
});

// Export all schemas as OpenAPI objects
const schemas = {
  LeaseRecordSchema,
  CreateLeaseSchema,
  ReturnCylinderSchema,
  LeaseResponseSchema,
  LeaseListResponseSchema,
  LeaseStatisticsSchema,
  LeaseStatisticsResponseSchema,
};

// Export all schemas as a single object for consistency with other schema files
export const leaseSchemas = exportSchemas(schemas);
