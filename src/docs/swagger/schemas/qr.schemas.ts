import { SchemaBuilder } from '../builder/SchemaBuilder';
import { exportSchemas } from '../builder/schemaExportHelper';

const sb = new SchemaBuilder();

const QRCodeDataSchema = sb
  .object('QRCodeData', {
    id: sb.integer('Cylinder ID'),
    code: sb.string('Cylinder code').example('CYL-001'),
    type: sb.string('Cylinder type').example('10kg'),
    outlet: sb.integer('Outlet ID'),
    qr: sb.string('QR code identifier').example('QR-CYL-001-a1b2c3d4'),
    v: sb.integer('Version number').example(1),
  })
  .required(['id', 'code', 'type', 'outlet', 'qr', 'v']);

// Response schemas with proper {success, message, data} wrapper format
const QRCodeResponseSchema = sb.object('QRCodeResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('QR code generated successfully'),
  data: sb.object('QRCodeData', {
    dataURL: sb
      .string('Base64 encoded QR code image')
      .example('data:image/png;base64,iVBORw0KGgoAAAANS...'),
    qrData: sb.string('JSON string of QR code data'),
    cylinder: sb.object('CylinderInfo', {
      id: sb.integer('Cylinder ID'),
      cylinderCode: sb.string('Cylinder code'),
      type: sb.string('Cylinder type'),
      status: sb.string('Current status'),
      currentOutletId: sb.integer('Current outlet ID'),
      qrCode: sb.string('QR code identifier'),
    }),
  }),
});

const BulkGenerateQRRequestSchema = sb
  .object('BulkGenerateQRRequest', {
    cylinderIds: sb.array(sb.integer()).min(1).max(100).example([1, 2, 3, 4, 5]),
  })
  .required(['cylinderIds']);

const BulkQRCodeResponseSchema = sb.object('BulkQRCodeResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Bulk QR codes generated successfully'),
  data: sb.object('BulkQRCodeData', {
    qrCodes: sb.array(
      sb.object('QRCodeItem', {
        cylinderId: sb.integer('Cylinder ID'),
        cylinderCode: sb.string('Cylinder code'),
        dataURL: sb.string('Base64 encoded QR code image'),
        qrData: sb.string('JSON string of QR code data'),
      })
    ),
    total: sb.integer('Total QR codes generated'),
    failed: sb.array(
      sb.object('FailedItem', {
        cylinderId: sb.integer('Cylinder ID'),
        error: sb.string('Error message'),
      })
    ),
  }),
});

const ValidateQRRequestSchema = sb
  .object('ValidateQRRequest', {
    qrData: sb
      .string('Scanned QR code data')
      .example(
        '{"id":1,"code":"CYL-001","type":"10kg","outlet":1,"qr":"QR-CYL-001-a1b2c3d4","v":1}'
      ),
  })
  .required(['qrData']);

const ValidateQRResponseSchema = sb.object('ValidateQRResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('QR code validated successfully'),
  data: sb.object('ValidateQRData', {
    valid: sb.boolean('Whether the QR code is valid'),
    cylinder: sb
      .object('CylinderDetails', {
        id: sb.integer('Cylinder ID'),
        cylinderCode: sb.string('Cylinder code'),
        type: sb.string('Cylinder type'),
        status: sb.string('Current status'),
        currentOutletId: sb.integer('Current outlet ID'),
        outletName: sb.string('Outlet name'),
        currentGasVolume: sb.number('Current gas volume'),
        maxGasVolume: sb.number('Maximum gas volume'),
        lastInspectionDate: sb.string('Last inspection date').format('date-time').nullable(),
      })
      .optional(),
    error: sb.string('Error message if invalid').optional(),
  }),
});

// Collect all schemas
const schemas = {
  QRCodeDataSchema,
  QRCodeResponseSchema,
  BulkGenerateQRRequestSchema,
  BulkQRCodeResponseSchema,
  ValidateQRRequestSchema,
  ValidateQRResponseSchema,
};

// Export all schemas as a single object
export const qrSchemas = exportSchemas(schemas);
