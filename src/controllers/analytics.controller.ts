import { Request, Response } from 'express';
import { analyticsService } from '@services/analytics.service';
import { ResponseUtil } from '@utils/response';
import { CONSTANTS } from '@config/constants';
import { AppError } from '@utils/errors';
import { asyncHandler } from '@utils/asyncHandler';

// Helper to get validated query parameters
const getValidatedQuery = (req: Request): any => {
  return req.validated?.query || req.query;
};

export class AnalyticsController {
  /**
   * Get analytics overview
   */
  getAnalyticsOverview = asyncHandler(async (req: Request, res: Response) => {
    const overview = await analyticsService.getAnalyticsOverview();
    ResponseUtil.success(res, overview, 'Analytics overview fetched successfully');
  });

  /**
   * Get dashboard metrics
   */
  getDashboardMetrics = asyncHandler(async (req: Request, res: Response) => {
    const query = getValidatedQuery(req);
    const { outletId } = query;

    const metrics = await analyticsService.getDashboardMetrics(
      outletId ? Number(outletId) : undefined
    );

    ResponseUtil.success(res, metrics, 'Dashboard metrics fetched successfully');
  });

  /**
   * Get all outlets performance
   */
  getAllOutletsPerformance = asyncHandler(async (req: Request, res: Response) => {
    const query = getValidatedQuery(req);
    const { dateFrom, dateTo } = query;

    const performances = await analyticsService.getAllOutletsPerformance(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    ResponseUtil.success(res, performances, 'All outlets performance data fetched successfully');
  });

  /**
   * Get outlet performance
   */
  getOutletPerformance = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const query = getValidatedQuery(req);
    const { dateFrom, dateTo } = query;

    const performance = await analyticsService.getOutletPerformance(
      Number(id),
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    ResponseUtil.success(res, performance, 'Outlet performance data fetched successfully');
  });

  /**
   * Get cylinder utilization
   */
  getCylinderUtilization = asyncHandler(async (req: Request, res: Response) => {
    const query = getValidatedQuery(req);
    const { dateFrom, dateTo } = query;

    const utilization = await analyticsService.getCylinderUtilization(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    ResponseUtil.success(res, utilization, 'Cylinder utilization data fetched successfully');
  });

  /**
   * Get revenue analytics
   */
  getRevenueAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const query = getValidatedQuery(req);
    const { period = 'monthly', dateFrom, dateTo, outletId } = query;

    if (!dateFrom || !dateTo) {
      throw new AppError('Date range is required', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
    }

    // Validate period
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validPeriods.includes(period as string)) {
      throw new AppError('Invalid period specified', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
    }

    const revenue = await analyticsService.getRevenueAnalytics(
      period as 'daily' | 'weekly' | 'monthly' | 'yearly',
      new Date(dateFrom as string),
      new Date(dateTo as string),
      outletId ? Number(outletId) : undefined
    );

    ResponseUtil.success(res, revenue, 'Revenue analytics fetched successfully');
  });

  /**
   * Get customer analytics
   */
  getCustomerAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const query = getValidatedQuery(req);
    const { dateFrom, dateTo } = query;

    const analytics = await analyticsService.getCustomerAnalytics(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    ResponseUtil.success(res, analytics, 'Customer analytics fetched successfully');
  });

  /**
   * Get all operators with metrics
   */
  getAllOperatorsWithMetrics = asyncHandler(async (req: Request, res: Response) => {
    const query = getValidatedQuery(req);
    const { dateFrom, dateTo } = query;

    const operatorsData = await analyticsService.getAllOperatorsWithMetrics(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    ResponseUtil.success(res, operatorsData, 'All operators data fetched successfully');
  });

  /**
   * Get operator performance
   */
  getOperatorPerformance = asyncHandler(async (req: Request, res: Response) => {
    const query = getValidatedQuery(req);
    const { dateFrom, dateTo } = query;

    const performance = await analyticsService.getOperatorPerformance(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    ResponseUtil.success(res, performance, 'Operator performance data fetched successfully');
  });

  /**
   * Export analytics data
   */
  exportAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const query = getValidatedQuery(req);
    const { type, format = 'csv', dateFrom, dateTo, outletId } = query;

    if (!type) {
      throw new AppError('Export type is required', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
    }

    // This is a placeholder for export functionality
    // In a real implementation, you would generate CSV/Excel files
    ResponseUtil.success(res, {
      type,
      format,
      dateFrom,
      dateTo,
      outletId,
    }, 'Export functionality not yet implemented');
  });
}

export const analyticsController = new AnalyticsController();
