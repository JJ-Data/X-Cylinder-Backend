import { SchemaBuilder } from '../builder/SchemaBuilder';
import { exportSchemas } from '../builder/schemaExportHelper';

const sb = new SchemaBuilder();

const RefillRecordSchema = sb
  .object('RefillRecord', {
    id: sb.integer('Unique identifier').readOnly(),
    cylinderId: sb.integer('Cylinder ID'),
    operatorId: sb.integer('Operator ID'),
    outletId: sb.integer('Outlet ID'),
    refillDate: sb.string('Refill date').format('date-time'),
    preRefillVolume: sb.number('Volume before refill').example(2.5),
    postRefillVolume: sb.number('Volume after refill').example(10),
    volumeAdded: sb.number('Volume added').readOnly(),
    refillCost: sb.number('Cost of refill').nullable(),
    notes: sb.string('Additional notes').nullable(),
    batchNumber: sb.string('Batch number for tracking').nullable(),
    createdAt: sb.string('Creation timestamp').format('date-time').readOnly(),
    updatedAt: sb.string('Last update timestamp').format('date-time').readOnly(),
  })
  .required(['cylinderId', 'operatorId', 'outletId', 'preRefillVolume', 'postRefillVolume']);

const CreateRefillSchema = sb
  .object('CreateRefill', {
    cylinderId: sb.integer('Cylinder ID'),
    preRefillVolume: sb.number('Volume before refill').example(2.5),
    postRefillVolume: sb.number('Volume after refill').example(10),
    refillCost: sb.number('Cost of refill').nullable().optional(),
    notes: sb.string('Additional notes').nullable().optional(),
    batchNumber: sb.string('Batch number for tracking').nullable().optional(),
  })
  .required(['cylinderId', 'preRefillVolume', 'postRefillVolume']);

const BulkRefillSchema = sb
  .object('BulkRefill', {
    batchNumber: sb.string('Batch number for tracking').example('BATCH-2024-001'),
    refills: sb
      .array(
        sb.object('RefillData', {
          cylinderCode: sb.string('Cylinder code').example('CYL-001'),
          preRefillVolume: sb.number('Volume before refill').example(2.5),
          postRefillVolume: sb.number('Volume after refill').example(10),
          refillCost: sb.number('Cost of refill').optional(),
        })
      )
      .min(1),
    notes: sb.string('Batch notes').optional(),
  })
  .required(['batchNumber', 'refills']);

// Response schemas with proper {success, message, data} wrapper format
const RefillResponseSchema = sb.object('RefillResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Refill completed successfully'),
  data: RefillRecordSchema,
});

const BulkRefillResponseSchema = sb.object('BulkRefillResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Bulk refill completed'),
  data: sb.object('BulkRefillResult', {
    successful: sb.integer('Number of successful refills'),
    failed: sb.array(
      sb.object('FailedRefill', {
        cylinderCode: sb.string('Cylinder code'),
        error: sb.string('Error message'),
      })
    ),
  }),
});

const RefillListResponseSchema = sb.object('RefillListResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Refills retrieved successfully'),
  data: sb.object('RefillListData', {
    refills: sb.array(RefillRecordSchema),
    total: sb.integer('Total number of refills'),
    page: sb.integer('Current page number'),
    totalPages: sb.integer('Total number of pages'),
  }),
});

const RefillStatisticsSchema = sb.object('RefillStatistics', {
  totalRefills: sb.integer('Total number of refills'),
  totalVolumeAdded: sb.number('Total volume added in liters'),
  totalCost: sb.number('Total cost of refills'),
  averageVolumePerRefill: sb.number('Average volume per refill'),
  refillsByType: sb.object('RefillsByType', {
    '5kg': sb.integer('Refills for 5kg cylinders').optional(),
    '10kg': sb.integer('Refills for 10kg cylinders').optional(),
    '15kg': sb.integer('Refills for 15kg cylinders').optional(),
    '50kg': sb.integer('Refills for 50kg cylinders').optional(),
  }),
  refillsByOperator: sb
    .object('RefillsByOperator', {})
    .additionalProperties(sb.integer())
    .optional(),
});

const RefillStatisticsResponseSchema = sb.object('RefillStatisticsResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Refill statistics retrieved successfully'),
  data: RefillStatisticsSchema,
});

// Export all schemas as OpenAPI objects
const schemas = {
  RefillRecordSchema,
  CreateRefillSchema,
  BulkRefillSchema,
  RefillResponseSchema,
  BulkRefillResponseSchema,
  RefillListResponseSchema,
  RefillStatisticsSchema,
  RefillStatisticsResponseSchema,
};

// Export all schemas as a single object for consistency with other schema files
export const refillSchemas = exportSchemas(schemas);
