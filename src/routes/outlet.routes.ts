import { Router } from 'express';
import { outletController } from '@controllers/outlet.controller';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validation.middleware';
import { outletValidation } from '@utils/validation';
import { CONSTANTS } from '@config/constants';

const router = Router();

// All outlet routes require authentication
router.use(authenticate);

// Create a new outlet (Admin only)
router.post(
  '/',
  authorize(CONSTANTS.USER_ROLES.ADMIN),
  validate(outletValidation.create),
  outletController.createOutlet
);

// Get all outlets (Admin and Staff)
router.get(
  '/',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  validate(outletValidation.query, 'query'),
  outletController.getAllOutlets
);

// Get outlet by ID (Admin and Staff)
router.get(
  '/:id',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  outletController.getOutletById
);

// Get outlet inventory (Admin, Staff, and Refill Operators)
router.get(
  '/:id/inventory',
  authorize(
    CONSTANTS.USER_ROLES.ADMIN,
    CONSTANTS.USER_ROLES.STAFF,
    CONSTANTS.USER_ROLES.REFILL_OPERATOR
  ),
  outletController.getOutletInventory
);

// Update outlet (Admin only)
router.put(
  '/:id',
  authorize(CONSTANTS.USER_ROLES.ADMIN),
  validate(outletValidation.update),
  outletController.updateOutlet
);

// Deactivate outlet (Admin only)
router.delete('/:id', authorize(CONSTANTS.USER_ROLES.ADMIN), outletController.deactivateOutlet);

export const outletRoutes: Router = router;
