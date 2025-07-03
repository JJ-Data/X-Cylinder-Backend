import { SchemaBuilder } from '../builder/SchemaBuilder';
import { exportSchemas } from '../builder/schemaExportHelper';

const sb = new SchemaBuilder();

const OutletSchema = sb
  .object('Outlet', {
    id: sb.integer('Unique identifier').readOnly(),
    name: sb.string('Outlet name').example('Downtown Outlet'),
    location: sb.string('Outlet address').example('123 Main Street, City'),
    contactPhone: sb.string('Contact phone number').example('+1234567890'),
    contactEmail: sb.string('Contact email').format('email').example('outlet@example.com'),
    status: sb.enum(['active', 'inactive'], 'Outlet status').example('active'),
    managerId: sb.integer('Manager user ID').nullable(),
    createdAt: sb.string('Creation timestamp').format('date-time').readOnly(),
    updatedAt: sb.string('Last update timestamp').format('date-time').readOnly(),
  })
  .required(['name', 'location', 'contactPhone', 'contactEmail']);

const CreateOutletSchema = sb
  .object('CreateOutlet', {
    name: sb.string('Outlet name').example('Downtown Outlet'),
    location: sb.string('Outlet address').example('123 Main Street, City'),
    contactPhone: sb.string('Contact phone number').example('+1234567890'),
    contactEmail: sb.string('Contact email').format('email').example('outlet@example.com'),
    managerId: sb.integer('Manager user ID').nullable(),
  })
  .required(['name', 'location', 'contactPhone', 'contactEmail']);

const UpdateOutletSchema = sb.object('UpdateOutlet', {
  name: sb.string('Outlet name').example('Downtown Outlet').optional(),
  location: sb.string('Outlet address').example('123 Main Street, City').optional(),
  contactPhone: sb.string('Contact phone number').example('+1234567890').optional(),
  contactEmail: sb.string('Contact email').format('email').example('outlet@example.com').optional(),
  status: sb.enum(['active', 'inactive'], 'Outlet status').example('active').optional(),
  managerId: sb.integer('Manager user ID').nullable().optional(),
});

const OutletInventorySchema = sb.object('OutletInventory', {
  outletId: sb.integer('Outlet ID'),
  totalCylinders: sb.integer('Total number of cylinders'),
  availableCylinders: sb.integer('Number of available cylinders'),
  leasedCylinders: sb.integer('Number of leased cylinders'),
  refillingCylinders: sb.integer('Number of cylinders being refilled'),
  damagedCylinders: sb.integer('Number of damaged cylinders'),
  byType: sb
    .object('CylindersByType', {
      '5kg': sb.integer('Number of 5kg cylinders').optional(),
      '10kg': sb.integer('Number of 10kg cylinders').optional(),
      '15kg': sb.integer('Number of 15kg cylinders').optional(),
      '50kg': sb.integer('Number of 50kg cylinders').optional(),
    })
    .description('Cylinders count by type'),
});

// Response schemas with proper {success, message, data} wrapper format
const OutletResponseSchema = sb.object('OutletResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Outlet retrieved successfully'),
  data: OutletSchema,
});

const OutletListResponseSchema = sb.object('OutletListResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Outlets retrieved successfully'),
  data: sb.object('OutletListData', {
    outlets: sb.array(OutletSchema),
    total: sb.integer('Total number of outlets'),
    page: sb.integer('Current page number'),
    totalPages: sb.integer('Total number of pages'),
  }),
});

const OutletInventoryResponseSchema = sb.object('OutletInventoryResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Outlet inventory retrieved successfully'),
  data: OutletInventorySchema,
});

// Export all schemas as OpenAPI objects
const schemas = {
  OutletSchema,
  CreateOutletSchema,
  UpdateOutletSchema,
  OutletInventorySchema,
  OutletResponseSchema,
  OutletListResponseSchema,
  OutletInventoryResponseSchema,
};

// Export all schemas as a single object for consistency with other schema files
export const outletSchemas = exportSchemas(schemas);
