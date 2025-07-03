import { Router } from 'express';
import { leaseController } from '@controllers/lease.controller';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validation.middleware';
import { leaseValidation } from '@utils/validation';
import { CONSTANTS } from '@config/constants';

const router = Router();

// All lease routes require authentication
router.use(authenticate);

// Get all leases with filters (Admin and Staff)
router.get(
  '/',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  validate(leaseValidation.query, 'query'),
  leaseController.getLeases
);

// Create a new lease (Staff only)
router.post(
  '/',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  validate(leaseValidation.create),
  leaseController.createLease
);

// Return a cylinder (Staff only)
router.post(
  '/return',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  validate(leaseValidation.return),
  leaseController.returnCylinder
);

// Update overdue leases (Admin only - usually run as a cron job)
router.post(
  '/update-overdue',
  authorize(CONSTANTS.USER_ROLES.ADMIN),
  leaseController.updateOverdueLeases
);

// Get lease statistics (Admin and Staff)
router.get(
  '/statistics',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  leaseController.getLeaseStatistics
);

// Get leases by customer (Customer can see own, Staff/Admin can see any)
router.get(
  '/customer/:customerId',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF, CONSTANTS.USER_ROLES.CUSTOMER),
  validate(leaseValidation.query, 'query'),
  leaseController.getCustomerLeases
);

// Get leases by outlet (Admin and Staff)
router.get(
  '/outlet/:outletId',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  validate(leaseValidation.query, 'query'),
  leaseController.getOutletLeases
);

// Get active lease by cylinder (All authenticated users)
router.get('/cylinder/:cylinderId/active', leaseController.getActiveLeasesByCylinder);

// Get lease by ID (All authenticated users)
router.get('/:id', leaseController.getLeaseById);

export const leaseRoutes: Router = router;
