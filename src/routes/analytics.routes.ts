import { Router } from 'express';
import { analyticsController } from '@controllers/analytics.controller';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validation.middleware';
import { analyticsValidation } from '@utils/validation';
import { CONSTANTS } from '@config/constants';

export const analyticsRoutes: Router = Router();

// All analytics routes require authentication
analyticsRoutes.use(authenticate);

/**
 * @route   GET /api/analytics/overview
 * @desc    Get analytics overview statistics
 * @access  Private (Admin, Staff)
 */
analyticsRoutes.get(
  '/overview',
  authorize(
    CONSTANTS.USER_ROLES.ADMIN,
    CONSTANTS.USER_ROLES.STAFF,
    CONSTANTS.USER_ROLES.REFILL_OPERATOR
  ),
  analyticsController.getAnalyticsOverview
);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard metrics
 * @access  Private (Admin, Staff)
 */
analyticsRoutes.get(
  '/dashboard',
  authorize(
    CONSTANTS.USER_ROLES.ADMIN,
    CONSTANTS.USER_ROLES.STAFF,
    CONSTANTS.USER_ROLES.REFILL_OPERATOR
  ),
  validate(analyticsValidation.dashboard, 'query'),
  analyticsController.getDashboardMetrics
);

/**
 * @route   GET /api/analytics/outlets
 * @desc    Get all outlets performance metrics
 * @access  Private (Admin, Staff)
 */
analyticsRoutes.get(
  '/outlets',
  authorize(
    CONSTANTS.USER_ROLES.ADMIN,
    CONSTANTS.USER_ROLES.STAFF,
    CONSTANTS.USER_ROLES.REFILL_OPERATOR
  ),
  validate(analyticsValidation.dateRange, 'query'),
  analyticsController.getAllOutletsPerformance
);

/**
 * @route   GET /api/analytics/outlets/:id/performance
 * @desc    Get outlet performance metrics
 * @access  Private (Admin, Staff)
 */
analyticsRoutes.get(
  '/outlets/:id/performance',
  authorize(
    CONSTANTS.USER_ROLES.ADMIN,
    CONSTANTS.USER_ROLES.STAFF,
    CONSTANTS.USER_ROLES.REFILL_OPERATOR
  ),
  validate(analyticsValidation.dateRange, 'query'),
  analyticsController.getOutletPerformance
);

/**
 * @route   GET /api/analytics/cylinders
 * @desc    Get cylinder utilization metrics
 * @access  Private (Admin, Staff)
 */
analyticsRoutes.get(
  '/cylinders',
  authorize(
    CONSTANTS.USER_ROLES.ADMIN,
    CONSTANTS.USER_ROLES.STAFF,
    CONSTANTS.USER_ROLES.REFILL_OPERATOR
  ),
  validate(analyticsValidation.dateRange, 'query'),
  analyticsController.getCylinderUtilization
);

/**
 * @route   GET /api/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Private (Admin, Staff)
 */
analyticsRoutes.get(
  '/revenue',
  authorize(
    CONSTANTS.USER_ROLES.ADMIN,
    CONSTANTS.USER_ROLES.STAFF,
    CONSTANTS.USER_ROLES.REFILL_OPERATOR
  ),
  validate(analyticsValidation.revenue, 'query'),
  analyticsController.getRevenueAnalytics
);

/**
 * @route   GET /api/analytics/customers
 * @desc    Get customer analytics
 * @access  Private (Admin, Staff)
 */
analyticsRoutes.get(
  '/customers',
  authorize(
    CONSTANTS.USER_ROLES.ADMIN,
    CONSTANTS.USER_ROLES.STAFF,
    CONSTANTS.USER_ROLES.REFILL_OPERATOR
  ),
  validate(analyticsValidation.dateRange, 'query'),
  analyticsController.getCustomerAnalytics
);

/**
 * @route   GET /api/analytics/operators
 * @desc    Get all operators with metrics
 * @access  Private (Admin, Staff)
 */
analyticsRoutes.get(
  '/operators',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  validate(analyticsValidation.dateRange, 'query'),
  analyticsController.getAllOperatorsWithMetrics
);

/**
 * @route   GET /api/analytics/operators/performance
 * @desc    Get operator performance metrics
 * @access  Private (Admin, Staff)
 */
analyticsRoutes.get(
  '/operators/performance',
  authorize(CONSTANTS.USER_ROLES.ADMIN, CONSTANTS.USER_ROLES.STAFF),
  validate(analyticsValidation.dateRange, 'query'),
  analyticsController.getOperatorPerformance
);

/**
 * @route   GET /api/analytics/export
 * @desc    Export analytics data
 * @access  Private (Admin, Staff)
 */
analyticsRoutes.get(
  '/export',
  authorize(
    CONSTANTS.USER_ROLES.ADMIN,
    CONSTANTS.USER_ROLES.STAFF,
    CONSTANTS.USER_ROLES.REFILL_OPERATOR
  ),
  validate(analyticsValidation.export, 'query'),
  analyticsController.exportAnalytics
);

export default analyticsRoutes;
