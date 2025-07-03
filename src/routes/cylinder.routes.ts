import { Router } from 'express';
import { cylinderController } from '@controllers/cylinder.controller';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validation.middleware';
import { cylinderValidation } from '@utils/validation';
import { CONSTANTS } from '@config/constants';

const router = Router();

// All cylinder routes require authentication
router.use(authenticate);

// Create a new cylinder (Admin and Staff)
router.post(
  '/',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  validate(cylinderValidation.create),
  cylinderController.createCylinder
);

// Bulk create cylinders (Admin only)
router.post(
  '/bulk',
  authorize(CONSTANTS.USER_ROLES.ADMIN),
  validate(cylinderValidation.bulkCreate),
  cylinderController.bulkCreateCylinders
);

// Search cylinders (All authenticated users)
router.get('/', validate(cylinderValidation.search, 'query'), cylinderController.searchCylinders);

// Get available cylinders by outlet (Staff and Refill Operators)
router.get(
  '/outlet/:outletId/available',
  authorize(
    CONSTANTS.USER_ROLES.ADMIN,
    CONSTANTS.USER_ROLES.STAFF,
    CONSTANTS.USER_ROLES.REFILL_OPERATOR
  ),
  cylinderController.getAvailableCylinders
);

// Get cylinder by ID (All authenticated users)
router.get('/:id', cylinderController.getCylinderById);

// Get cylinder by code (All authenticated users)
router.get('/code/:code', cylinderController.getCylinderByCode);

// Get cylinder by QR code (All authenticated users)
router.get('/qr/:qrCode', cylinderController.getCylinderByQRCode);

// Get cylinder history (Staff and Admin)
router.get(
  '/:id/history',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  cylinderController.getCylinderHistory
);

// Update cylinder (Admin and Staff)
router.put(
  '/:id',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  validate(cylinderValidation.update),
  cylinderController.updateCylinder
);

// Retire cylinder (Admin only)
router.post(
  '/:id/retire',
  authorize(CONSTANTS.USER_ROLES.ADMIN),
  validate(cylinderValidation.retire),
  cylinderController.retireCylinder
);

// Transfer cylinder to another outlet (Admin only)
router.post(
  '/:id/transfer',
  authorize(CONSTANTS.USER_ROLES.ADMIN),
  validate(cylinderValidation.transfer),
  cylinderController.transferCylinder
);

export const cylinderRoutes: Router = router;
