import { Router } from 'express';
import { customerController } from '@controllers/customer.controller';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validation.middleware';
import { customerValidation } from '@utils/validation';
import { CONSTANTS } from '@config/constants';

const router = Router();

// Public routes (no authentication required)
// Customer self-registration
router.post(
  '/register',
  validate(customerValidation.register),
  customerController.registerCustomer
);

// Activate customer account (payment callback)
router.post(
  '/activate',
  validate(customerValidation.activate),
  customerController.activateCustomer
);

// All routes below require authentication
router.use(authenticate);

// Search customers (Admin and Staff)
router.get(
  '/',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  validate(customerValidation.search, 'query'),
  customerController.searchCustomers
);

// Get customers by outlet (Admin and Staff)
router.get(
  '/outlet/:outletId',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  customerController.getCustomersByOutlet
);

// Get customer by ID (Customer can see own, Staff/Admin can see any)
router.get(
  '/:id',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF, CONSTANTS.USER_ROLES.CUSTOMER),
  customerController.getCustomerById
);

// Resend payment link (Admin and Staff)
router.post(
  '/:userId/resend-payment',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  customerController.resendPaymentLink
);

// Deactivate customer (Admin only)
router.post(
  '/:id/deactivate',
  authorize(CONSTANTS.USER_ROLES.ADMIN),
  validate(customerValidation.deactivate),
  customerController.deactivateCustomer
);

export const customerRoutes: Router = router;
