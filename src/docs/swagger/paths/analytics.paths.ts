import { PathBuilder } from '../builder/PathBuilder';

const pb = new PathBuilder();

export const analyticsPaths = {
  '/analytics/dashboard': {
    get: pb
      .endpoint('getDashboardMetrics', 'Analytics')
      .summary('Get dashboard metrics')
      .description('Retrieves key performance metrics for the dashboard')
      .query('outletId', 'integer', false, 'Filter by outlet ID')
      .response(200, 'DashboardMetricsResponse', 'Dashboard metrics retrieved successfully')
      .response(403, 'Error', 'Access denied')
      .build(),
  },

  '/analytics/outlets/{id}/performance': {
    get: pb
      .endpoint('getOutletPerformance', 'Analytics')
      .summary('Get outlet performance metrics')
      .description('Retrieves detailed performance metrics for a specific outlet')
      .path('id', 'integer', 'Outlet ID')
      .query('dateFrom', 'string', false, 'Start date (YYYY-MM-DD)')
      .query('dateTo', 'string', false, 'End date (YYYY-MM-DD)')
      .response(
        200,
        'OutletPerformanceResponse',
        'Outlet performance metrics retrieved successfully'
      )
      .response(404, 'Error', 'Outlet not found')
      .build(),
  },

  '/analytics/cylinders/utilization': {
    get: pb
      .endpoint('getCylinderUtilization', 'Analytics')
      .summary('Get cylinder utilization metrics')
      .description('Retrieves cylinder utilization rates and statistics')
      .query('dateFrom', 'string', false, 'Start date (YYYY-MM-DD)')
      .query('dateTo', 'string', false, 'End date (YYYY-MM-DD)')
      .response(
        200,
        'CylinderUtilizationResponse',
        'Cylinder utilization metrics retrieved successfully'
      )
      .response(403, 'Error', 'Access denied')
      .build(),
  },

  '/analytics/revenue': {
    get: pb
      .endpoint('getRevenueAnalytics', 'Analytics')
      .summary('Get revenue analytics')
      .description('Retrieves revenue breakdown and trends')
      .query('period', 'string', false, 'Time period (daily, weekly, monthly, yearly)')
      .query('dateFrom', 'string', true, 'Start date (YYYY-MM-DD)')
      .query('dateTo', 'string', true, 'End date (YYYY-MM-DD)')
      .query('outletId', 'integer', false, 'Filter by outlet ID')
      .response(200, 'RevenueAnalyticsResponse', 'Revenue analytics retrieved successfully')
      .response(400, 'Error', 'Invalid date range')
      .build(),
  },

  '/analytics/customers': {
    get: pb
      .endpoint('getCustomerAnalytics', 'Analytics')
      .summary('Get customer analytics')
      .description('Retrieves customer metrics including retention and activity')
      .query('dateFrom', 'string', false, 'Start date (YYYY-MM-DD)')
      .query('dateTo', 'string', false, 'End date (YYYY-MM-DD)')
      .response(200, 'CustomerAnalyticsResponse', 'Customer analytics retrieved successfully')
      .response(403, 'Error', 'Access denied')
      .build(),
  },

  '/analytics/operators/performance': {
    get: pb
      .endpoint('getOperatorPerformance', 'Analytics')
      .summary('Get operator performance metrics')
      .description('Retrieves performance metrics for refill operators')
      .query('dateFrom', 'string', false, 'Start date (YYYY-MM-DD)')
      .query('dateTo', 'string', false, 'End date (YYYY-MM-DD)')
      .response(
        200,
        'OperatorPerformanceResponse',
        'Operator performance metrics retrieved successfully'
      )
      .response(403, 'Error', 'Access denied')
      .build(),
  },

  '/analytics/export': {
    get: pb
      .endpoint('exportAnalytics', 'Analytics')
      .summary('Export analytics data')
      .description('Exports analytics data in CSV or Excel format')
      .query(
        'type',
        'string',
        true,
        'Export type (dashboard, revenue, customers, cylinders, operators)'
      )
      .query('format', 'string', false, 'Export format (csv, excel)')
      .query('dateFrom', 'string', false, 'Start date (YYYY-MM-DD)')
      .query('dateTo', 'string', false, 'End date (YYYY-MM-DD)')
      .query('outletId', 'integer', false, 'Filter by outlet ID')
      .response(200, 'ExportAnalyticsResponse', 'Analytics data exported successfully')
      .response(400, 'Error', 'Invalid export type')
      .build(),
  },
};
