import { Router, type IRouter } from 'express';
import transferController from '../controllers/transfer.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { CONSTANTS } from '../config/constants';

const router: IRouter = Router();

// All transfer routes require authentication
router.use(authenticate);

// Get transfer history (admin and staff)
router.get(
  '/',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  transferController.getTransferHistory
);

// Get transfer statistics (admin and staff)
router.get(
  '/statistics',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  transferController.getTransferStatistics
);

// Export transfers (admin and staff)
router.get(
  '/export',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  transferController.exportTransfers
);

// Get transfer by ID (admin and staff)
router.get(
  '/:id',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  transferController.getTransferById
);

// Accept transfer (staff at destination outlet)
router.put(
  '/:id/accept',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  transferController.acceptTransfer
);

// Reject transfer (staff at destination outlet)
router.put(
  '/:id/reject',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  transferController.rejectTransfer
);

export default router;