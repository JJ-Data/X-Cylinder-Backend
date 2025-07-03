import { SchemaBuilder } from '../builder/SchemaBuilder';
import { exportSchemas } from '../builder/schemaExportHelper';

const sb = new SchemaBuilder();

// Define schemas using the fluent pattern
const CylinderSchema = sb
  .object('Cylinder', {
    id: sb.integer('Unique identifier').readOnly(),
    cylinderCode: sb.string('Unique cylinder code').example('CYL-001'),
    type: sb.enum(['5kg', '10kg', '15kg', '50kg'], 'Cylinder type').example('10kg'),
    status: sb
      .enum(['available', 'leased', 'refilling', 'damaged', 'retired'], 'Cylinder status')
      .example('available'),
    currentOutletId: sb.integer('Current outlet ID'),
    qrCode: sb.string('QR code for scanning').example('QR-CYL-001-a1b2c3d4'),
    manufactureDate: sb.string('Manufacture date').format('date-time').nullable(),
    lastInspectionDate: sb.string('Last inspection date').format('date-time').nullable(),
    currentGasVolume: sb.number('Current gas volume in liters').example(8.5),
    maxGasVolume: sb.number('Maximum gas volume in liters').example(10),
    notes: sb.string('Additional notes about the cylinder').nullable().optional(),
    createdAt: sb.string('Creation timestamp').format('date-time').readOnly(),
    updatedAt: sb.string('Last update timestamp').format('date-time').readOnly(),
  })
  .required(['cylinderCode', 'type', 'currentOutletId', 'qrCode', 'maxGasVolume']);

const CreateCylinderSchema = sb
  .object('CreateCylinder', {
    cylinderCode: sb.string('Unique cylinder code').example('CYL-001'),
    type: sb.enum(['5kg', '10kg', '15kg', '50kg'], 'Cylinder type').example('10kg'),
    currentOutletId: sb.integer('Current outlet ID'),
    manufactureDate: sb.string('Manufacture date').format('date-time').nullable().optional(),
    lastInspectionDate: sb.string('Last inspection date').format('date-time').nullable().optional(),
    maxGasVolume: sb.number('Maximum gas volume in liters').example(10),
    currentGasVolume: sb.number('Initial gas volume').optional(),
  })
  .required(['cylinderCode', 'type', 'currentOutletId', 'maxGasVolume']);

const UpdateCylinderSchema = sb.object('UpdateCylinder', {
  type: sb.enum(['5kg', '10kg', '15kg', '50kg'], 'Cylinder type').optional(),
  status: sb
    .enum(['available', 'leased', 'refilling', 'damaged', 'retired'], 'Cylinder status')
    .optional(),
  currentOutletId: sb.integer('Current outlet ID').optional(),
  lastInspectionDate: sb.string('Last inspection date').format('date-time').nullable().optional(),
  currentGasVolume: sb.number('Current gas volume in liters').optional(),
});

const BulkCreateCylindersSchema = sb
  .object('BulkCreateCylinders', {
    cylinders: sb.array(CreateCylinderSchema).min(1),
  })
  .required(['cylinders']);

const RetireCylinderSchema = sb
  .object('RetireCylinder', {
    reason: sb.string('Reason for retirement').example('Damaged beyond repair'),
  })
  .required(['reason']);

// Response schemas with proper {success, message, data} wrapper format
const CylinderResponseSchema = sb.object('CylinderResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Cylinder retrieved successfully'),
  data: CylinderSchema,
});

const CylinderListResponseSchema = sb.object('CylinderListResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Cylinders retrieved successfully'),
  data: sb.object('CylinderListData', {
    cylinders: sb.array(CylinderSchema),
    total: sb.integer('Total number of cylinders'),
    page: sb.integer('Current page number'),
    totalPages: sb.integer('Total number of pages'),
  }),
});

const CylinderHistorySchema = sb.object('CylinderHistory', {
  cylinder: CylinderSchema,
  leaseHistory: sb.array(SchemaBuilder.ref('LeaseRecord')),
  refillHistory: sb.array(SchemaBuilder.ref('RefillRecord')),
  transferHistory: sb.array(SchemaBuilder.ref('TransferRecord')),
});

const CylinderHistoryResponseSchema = sb.object('CylinderHistoryResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Cylinder history retrieved successfully'),
  data: CylinderHistorySchema,
});

const BulkCreateCylindersResponseSchema = sb.object('BulkCreateCylindersResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Cylinders created successfully'),
  data: sb.object('BulkCreateResult', {
    created: sb.array(CylinderSchema),
    failed: sb
      .array(
        sb.object('FailedCylinder', {
          cylinderCode: sb.string('Cylinder code that failed'),
          error: sb.string('Error message'),
        })
      )
      .optional(),
  }),
});

// Export all schemas as OpenAPI objects
const schemas = {
  CylinderSchema,
  CreateCylinderSchema,
  UpdateCylinderSchema,
  BulkCreateCylindersSchema,
  RetireCylinderSchema,
  CylinderResponseSchema,
  CylinderListResponseSchema,
  CylinderHistorySchema,
  CylinderHistoryResponseSchema,
  BulkCreateCylindersResponseSchema,
};

// Export all schemas as a single object for consistency with other schema files
export const cylinderSchemas = exportSchemas(schemas);
