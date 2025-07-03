import { Router } from 'express';
import { refillController } from '@controllers/refill.controller';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validation.middleware';
import { refillValidation } from '@utils/validation';
import { CONSTANTS } from '@config/constants';

const router = Router();

// All refill routes require authentication
router.use(authenticate);

// Create a new refill (Refill Operators only)
router.post(
  '/',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.REFILL_OPERATOR),
  validate(refillValidation.create),
  refillController.createRefill
);

// Bulk refill (Refill Operators only)
router.post(
  '/bulk',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.REFILL_OPERATOR),
  validate(refillValidation.bulkRefill),
  refillController.bulkRefill
);

// Get refill statistics (Admin and Staff)
router.get(
  '/statistics',
  authorize(
    CONSTANTS.USER_ROLES.ADMIN,
    CONSTANTS.USER_ROLES.STAFF,
    CONSTANTS.USER_ROLES.REFILL_OPERATOR
  ),
  validate(refillValidation.query, 'query'),
  refillController.getRefillStatistics
);

// Get refills by cylinder (All authenticated users)
router.get(
  '/cylinder/:cylinderId',
  validate(refillValidation.query, 'query'),
  refillController.getCylinderRefills
);

// Get refills by operator (Admin, Staff, and the operator themselves)
router.get(
  '/operator/:operatorId',
  authorize(
    CONSTANTS.USER_ROLES.ADMIN,
    CONSTANTS.USER_ROLES.STAFF,
    CONSTANTS.USER_ROLES.REFILL_OPERATOR
  ),
  validate(refillValidation.query, 'query'),
  refillController.getOperatorRefills
);

// Get refills by outlet (Admin, Staff, and Refill Operators)
router.get(
  '/outlet/:outletId',
  authorize(
    CONSTANTS.USER_ROLES.ADMIN,
    CONSTANTS.USER_ROLES.STAFF,
    CONSTANTS.USER_ROLES.REFILL_OPERATOR
  ),
  validate(refillValidation.query, 'query'),
  refillController.getOutletRefills
);

// Get refill by ID (All authenticated users)
router.get('/:id', refillController.getRefillById);

export const refillRoutes: Router = router;
