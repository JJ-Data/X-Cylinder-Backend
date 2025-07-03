import { Router } from 'express';
import { qrController } from '@controllers/qr.controller';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validation.middleware';
import { qrValidation } from '@utils/validation';
import { CONSTANTS } from '@config/constants';

const router = Router();

// All QR routes require authentication
router.use(authenticate);

// Get QR code data for a cylinder
router.get('/cylinder/:id', qrController.getCylinderQRCode);

// Download QR code image for a cylinder
router.get('/cylinder/:id/download', qrController.downloadCylinderQRCode);

// Generate QR codes for multiple cylinders
router.post(
  '/bulk',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  validate(qrValidation.bulkGenerate),
  qrController.generateBulkQRCodes
);

// Validate a QR code
router.post('/validate', validate(qrValidation.validate), qrController.validateQRCode);

export const qrRoutes: Router = router;
