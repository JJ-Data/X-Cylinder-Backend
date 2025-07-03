import { PathBuilder } from '../builder/PathBuilder';

const pb = new PathBuilder();

export const qrPaths = {
  '/qr/cylinders/{id}': {
    get: pb
      .endpoint('getCylinderQRCode', 'QR')
      .summary('Get QR code for a specific cylinder')
      .description('Generates and returns QR code data for a cylinder')
      .path('id', 'integer', 'Cylinder ID')
      .response(200, 'QRCodeResponse')
      .response(404, 'Error', 'Cylinder not found')
      .build(),
  },

  '/qr/cylinders/{id}/download': {
    get: pb
      .endpoint('downloadCylinderQRCode', 'QR')
      .summary('Download QR code image for a cylinder')
      .description('Downloads QR code as PNG or SVG image file')
      .path('id', 'integer', 'Cylinder ID')
      .query('format', 'string', false, 'Image format (png or svg)')
      .response(200, 'file', 'QR code image file')
      .response(404, 'Error', 'Cylinder not found')
      .build(),
  },

  '/qr/cylinders/bulk': {
    post: pb
      .endpoint('bulkGenerateQRCodes', 'QR')
      .summary('Generate QR codes for multiple cylinders')
      .description('Generates QR codes for a list of cylinder IDs')
      .body('BulkGenerateQRRequest')
      .response(200, 'BulkQRCodeResponse')
      .response(400, 'Error', 'Invalid request')
      .build(),
  },

  '/qr/validate': {
    post: pb
      .endpoint('validateQRCode', 'QR')
      .summary('Validate a scanned QR code')
      .description('Validates QR code data and returns cylinder information')
      .body('ValidateQRRequest')
      .response(200, 'ValidateQRResponse')
      .response(400, 'Error', 'Invalid QR code')
      .build(),
  },
};
