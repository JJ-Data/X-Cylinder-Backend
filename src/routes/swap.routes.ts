import { Router } from 'express';
import { swapController } from '@controllers/swap.controller';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { enforceOutletAccess, addOutletFilter, validateOutletParam } from '@middlewares/outlet.middleware';
import { validateBody, validateQuery } from '@middlewares/validation.middleware';
import { CreateSwapDto } from '@app-types/swap.types';
import { CONSTANTS } from '@config/constants';
import Joi from 'joi';

const router: Router = Router();

// Apply authentication and outlet access control
router.use(authenticate);
router.use(enforceOutletAccess);

// Validation schemas
const createSwapSchema = Joi.object<CreateSwapDto>({
  leaseId: Joi.number().positive().optional(),
  cylinderCode: Joi.string().max(50).optional(),
  qrCode: Joi.string().max(255).optional(),
  newCylinderId: Joi.number().positive().required(),
  condition: Joi.string().valid('good', 'poor', 'damaged').required(),
  weightRecorded: Joi.number().min(0).optional(),
  damageNotes: Joi.string().max(1000).optional(),
  swapFee: Joi.number().min(0).optional(),
  reasonForFee: Joi.string().max(500).optional(),
  notes: Joi.string().max(1000).optional(),
}).xor('leaseId', 'cylinderCode', 'qrCode'); // Require exactly one identifier

const swapFiltersSchema = Joi.object({
  leaseId: Joi.number().positive().optional(),
  customerId: Joi.number().positive().optional(),
  staffId: Joi.number().positive().optional(),
  oldCylinderId: Joi.number().positive().optional(),
  newCylinderId: Joi.number().positive().optional(),
  condition: Joi.string().valid('good', 'poor', 'damaged').optional(),
  outletId: Joi.number().positive().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().positive().optional(),
  limit: Joi.number().positive().max(100).optional(),
  search: Joi.string().max(100).optional(),
});

// Authorization helper for admin/staff/operator access
const authorizeSwapAccess = authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF, CONSTANTS.USER_ROLES.REFILL_OPERATOR);

/**
 * @route   GET /api/v1/swaps
 * @desc    Get list of cylinder swaps with filters
 * @access  Private (Admin/Staff/Operator)
 */
router.get('/', authorizeSwapAccess, addOutletFilter, validateQuery(swapFiltersSchema), swapController.getSwaps);

/**
 * @route   POST /api/v1/swaps
 * @desc    Create a new cylinder swap
 * @access  Private (Admin/Staff/Operator)
 */
router.post('/', authorizeSwapAccess, validateBody(createSwapSchema), swapController.createSwap);

/**
 * @route   GET /api/v1/swaps/statistics
 * @desc    Get swap statistics
 * @access  Private (Admin/Staff/Operator)
 */
router.get('/statistics', authorizeSwapAccess, addOutletFilter, swapController.getSwapStatistics);

/**
 * @route   GET /api/v1/swaps/find-cylinder
 * @desc    Find cylinder by lease ID, cylinder code, or QR code
 * @access  Private (Admin/Staff/Operator)
 */
router.get('/find-cylinder', authorizeSwapAccess, swapController.findCylinder);

/**
 * @route   GET /api/v1/swaps/available-cylinders
 * @desc    Get available cylinders for swap
 * @access  Private (Admin/Staff/Operator)
 */
router.get('/available-cylinders', authorizeSwapAccess, addOutletFilter, swapController.getAvailableCylinders);

/**
 * @route   GET /api/v1/swaps/customers/:customerId
 * @desc    Get swaps for a specific customer
 * @access  Private (Admin/Staff/Operator)
 */
router.get('/customers/:customerId', authorizeSwapAccess, addOutletFilter, swapController.getSwapsByCustomer);

/**
 * @route   GET /api/v1/swaps/outlets/:outletId
 * @desc    Get swaps for a specific outlet
 * @access  Private (Admin/Staff/Operator)
 */
router.get('/outlets/:outletId', authorizeSwapAccess, validateOutletParam('outletId'), swapController.getOutletSwaps);

/**
 * @route   GET /api/v1/swaps/:id
 * @desc    Get swap details by ID
 * @access  Private (Admin/Staff/Operator)
 */
router.get('/:id', authorizeSwapAccess, swapController.getSwapById);

/**
 * @route   GET /api/v1/swaps/:id/receipt
 * @desc    Get swap receipt data
 * @access  Private (Admin/Staff/Operator)
 */
router.get('/:id/receipt', authorizeSwapAccess, swapController.getSwapReceiptData);

/**
 * @route   PATCH /api/v1/swaps/:id/receipt-printed
 * @desc    Mark swap receipt as printed
 * @access  Private (Admin/Staff/Operator)
 */
router.patch('/:id/receipt-printed', authorizeSwapAccess, swapController.markReceiptPrinted);

export default router;
