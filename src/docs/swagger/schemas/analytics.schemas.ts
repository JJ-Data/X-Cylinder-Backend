import { SchemaBuilder } from '../builder/SchemaBuilder';
import { exportSchemas } from '../builder/schemaExportHelper';

const sb = new SchemaBuilder();

// Dashboard Metrics
const DashboardMetricsSchema = sb
  .object('DashboardMetrics', {
    overview: sb.object('Overview', {
      totalOutlets: sb.integer('Total number of outlets'),
      totalCylinders: sb.integer('Total number of cylinders'),
      totalCustomers: sb.integer('Total number of customers'),
      activeLeases: sb.integer('Number of active leases'),
      monthlyRevenue: sb.number('Revenue for current month'),
      cylinderUtilizationRate: sb.number('Utilization rate percentage').example(75.5),
    }),
    topPerformingOutlets: sb.array(
      sb.object('TopOutlet', {
        outletId: sb.integer('Outlet ID'),
        outletName: sb.string('Outlet name'),
        monthlyRevenue: sb.number('Monthly revenue'),
        activeLeases: sb.integer('Active leases count'),
      })
    ),
    recentActivity: sb.array(
      sb.object('Activity', {
        type: sb.enum(['lease', 'return', 'refill', 'transfer'], 'Activity type'),
        timestamp: sb.string('Activity timestamp').format('date-time'),
        description: sb.string('Activity description'),
      })
    ),
    cylinderStatus: sb.object('CylinderStatus', {
      available: sb.integer('Available cylinders'),
      leased: sb.integer('Leased cylinders'),
      refilling: sb.integer('Cylinders being refilled'),
      damaged: sb.integer('Damaged cylinders'),
      retired: sb.integer('Retired cylinders'),
    }),
  })
  .required(['overview', 'topPerformingOutlets', 'recentActivity', 'cylinderStatus']);

// Outlet Performance
const OutletPerformanceSchema = sb
  .object('OutletPerformance', {
    outletId: sb.integer('Outlet ID'),
    outletName: sb.string('Outlet name'),
    metrics: sb.object('OutletMetrics', {
      totalCylinders: sb.integer('Total cylinders at outlet'),
      activeCylinders: sb.integer('Active cylinders'),
      monthlyLeases: sb.integer('Leases this month'),
      monthlyReturns: sb.integer('Returns this month'),
      monthlyRefills: sb.integer('Refills this month'),
      revenue: sb.number('Total revenue'),
      cylinderTurnoverRate: sb.number('Turnover rate percentage'),
    }),
    topCustomers: sb.array(
      sb.object('TopCustomer', {
        customerId: sb.integer('Customer ID'),
        customerName: sb.string('Customer name'),
        activeLeases: sb.integer('Active leases'),
        totalSpent: sb.number('Total amount spent'),
      })
    ),
    cylinderBreakdown: sb.object('CylinderBreakdown', {}).additionalProperties(sb.integer()),
  })
  .required(['outletId', 'outletName', 'metrics', 'topCustomers', 'cylinderBreakdown']);

// Cylinder Utilization
const CylinderUtilizationSchema = sb
  .object('CylinderUtilization', {
    utilizationRate: sb.number('Overall utilization rate percentage'),
    averageLeaseDuration: sb.number('Average lease duration in days'),
    cylindersByStatus: sb.object('StatusCounts', {}).additionalProperties(sb.integer()),
    utilizationByType: sb.object('TypeUtilization', {}).additionalProperties(sb.number()),
    utilizationByOutlet: sb.array(
      sb.object('OutletUtilization', {
        outletId: sb.integer('Outlet ID'),
        outletName: sb.string('Outlet name'),
        utilizationRate: sb.number('Utilization rate percentage'),
      })
    ),
  })
  .required([
    'utilizationRate',
    'averageLeaseDuration',
    'cylindersByStatus',
    'utilizationByType',
    'utilizationByOutlet',
  ]);

// Revenue Analytics
const RevenueAnalyticsSchema = sb
  .object('RevenueAnalytics', {
    period: sb.enum(['daily', 'weekly', 'monthly', 'yearly'], 'Analysis period'),
    totalRevenue: sb.number('Total revenue for period'),
    leaseRevenue: sb.number('Revenue from leases'),
    refillRevenue: sb.number('Revenue from refills'),
    depositRevenue: sb.number('Net deposit revenue'),
    revenueByOutlet: sb.array(
      sb.object('OutletRevenue', {
        outletId: sb.integer('Outlet ID'),
        outletName: sb.string('Outlet name'),
        revenue: sb.number('Revenue amount'),
      })
    ),
    dailyRevenue: sb.array(
      sb.object('DailyRevenue', {
        date: sb.string('Date (YYYY-MM-DD)'),
        revenue: sb.number('Revenue amount'),
      })
    ),
  })
  .required([
    'period',
    'totalRevenue',
    'leaseRevenue',
    'refillRevenue',
    'depositRevenue',
    'revenueByOutlet',
    'dailyRevenue',
  ]);

// Customer Analytics
const CustomerAnalyticsSchema = sb
  .object('CustomerAnalytics', {
    totalCustomers: sb.integer('Total number of customers'),
    activeCustomers: sb.integer('Active customers in period'),
    newCustomers: sb.integer('New customers in period'),
    customerRetentionRate: sb.number('Retention rate percentage'),
    topCustomers: sb.array(
      sb.object('CustomerDetail', {
        customerId: sb.integer('Customer ID'),
        customerName: sb.string('Customer name'),
        totalLeases: sb.integer('Total leases'),
        totalSpent: sb.number('Total amount spent'),
        lastActivity: sb.string('Last activity date').format('date-time'),
      })
    ),
    customersByOutlet: sb.array(
      sb.object('OutletCustomers', {
        outletId: sb.integer('Outlet ID'),
        outletName: sb.string('Outlet name'),
        customerCount: sb.integer('Number of customers'),
      })
    ),
  })
  .required([
    'totalCustomers',
    'activeCustomers',
    'newCustomers',
    'customerRetentionRate',
    'topCustomers',
    'customersByOutlet',
  ]);

// Operator Performance
const OperatorPerformanceSchema = sb
  .object('OperatorPerformance', {
    operators: sb.array(
      sb.object('OperatorMetrics', {
        operatorId: sb.integer('Operator ID'),
        operatorName: sb.string('Operator name'),
        totalRefills: sb.integer('Total refills performed'),
        totalVolume: sb.number('Total volume refilled'),
        averageRefillTime: sb.number('Average refill time in minutes'),
        efficiency: sb.number('Efficiency score'),
      })
    ),
    refillsByDay: sb.array(
      sb.object('DailyRefills', {
        date: sb.string('Date (YYYY-MM-DD)'),
        refillCount: sb.integer('Number of refills'),
      })
    ),
  })
  .required(['operators', 'refillsByDay']);

// Export Response
const ExportResponseSchema = sb
  .object('ExportResponse', {
    type: sb.string('Export type'),
    format: sb.string('Export format'),
    dateFrom: sb.string('Start date').optional(),
    dateTo: sb.string('End date').optional(),
    outletId: sb.integer('Outlet ID').optional(),
  })
  .required(['type', 'format']);

// Wrapped response schemas with proper {success, message, data} format
const DashboardMetricsResponseSchema = sb.object('DashboardMetricsResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Dashboard metrics retrieved successfully'),
  data: DashboardMetricsSchema,
});

const OutletPerformanceResponseSchema = sb.object('OutletPerformanceResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb
    .string('Response message')
    .example('Outlet performance metrics retrieved successfully'),
  data: OutletPerformanceSchema,
});

const CylinderUtilizationResponseSchema = sb.object('CylinderUtilizationResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb
    .string('Response message')
    .example('Cylinder utilization metrics retrieved successfully'),
  data: CylinderUtilizationSchema,
});

const RevenueAnalyticsResponseSchema = sb.object('RevenueAnalyticsResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Revenue analytics retrieved successfully'),
  data: RevenueAnalyticsSchema,
});

const CustomerAnalyticsResponseSchema = sb.object('CustomerAnalyticsResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Customer analytics retrieved successfully'),
  data: CustomerAnalyticsSchema,
});

const OperatorPerformanceResponseSchema = sb.object('OperatorPerformanceResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb
    .string('Response message')
    .example('Operator performance metrics retrieved successfully'),
  data: OperatorPerformanceSchema,
});

const ExportAnalyticsResponseSchema = sb.object('ExportAnalyticsResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Analytics data exported successfully'),
  data: ExportResponseSchema,
});

// Collect all schemas
const schemas = {
  DashboardMetricsSchema,
  OutletPerformanceSchema,
  CylinderUtilizationSchema,
  RevenueAnalyticsSchema,
  CustomerAnalyticsSchema,
  OperatorPerformanceSchema,
  ExportResponseSchema,
  DashboardMetricsResponseSchema,
  OutletPerformanceResponseSchema,
  CylinderUtilizationResponseSchema,
  RevenueAnalyticsResponseSchema,
  CustomerAnalyticsResponseSchema,
  OperatorPerformanceResponseSchema,
  ExportAnalyticsResponseSchema,
};

// Export all schemas as a single object
export const analyticsSchemas = exportSchemas(schemas);
