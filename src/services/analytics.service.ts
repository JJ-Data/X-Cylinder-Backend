import { sequelize } from '@config/database';
import { Op, QueryTypes } from 'sequelize';
import { User, Outlet, Cylinder, LeaseRecord, RefillRecord } from '@models/index';
import { CONSTANTS } from '@config/constants';
import moment from 'moment';

export interface DashboardMetrics {
  overview: {
    totalOutlets: number;
    totalCylinders: number;
    totalCustomers: number;
    activeLeases: number;
    monthlyRevenue: number;
    cylinderUtilizationRate: number;
  };
  topPerformingOutlets: Array<{
    outletId: number;
    outletName: string;
    monthlyRevenue: number;
    activeLeases: number;
  }>;
  recentActivity: Array<{
    type: 'lease' | 'return' | 'refill' | 'transfer';
    timestamp: Date;
    description: string;
  }>;
  cylinderStatus: {
    available: number;
    leased: number;
    refilling: number;
    damaged: number;
    retired: number;
  };
}

export interface OutletPerformance {
  outletId: number;
  outletName: string;
  metrics: {
    totalCylinders: number;
    activeCylinders: number;
    monthlyLeases: number;
    monthlyReturns: number;
    monthlyRefills: number;
    revenue: number;
    cylinderTurnoverRate: number;
  };
  topCustomers: Array<{
    customerId: number;
    customerName: string;
    activeLeases: number;
    totalSpent: number;
  }>;
  cylinderBreakdown: Record<string, number>;
}

export interface RevenueAnalytics {
  summary: {
    totalRevenue: number;
    leaseRevenue: number;
    refillRevenue: number;
    growthRate: number;
    averageTransaction: number;
  };
  byOutlet: Array<{
    outletId: number;
    outletName: string;
    revenue: number;
    leaseRevenue: number;
    refillRevenue: number;
    transactionCount: number;
  }>;
  byPeriod: Array<{
    period: string;
    revenue: number;
    leaseRevenue: number;
    refillRevenue: number;
    transactionCount: number;
  }>;
  topCustomers: Array<{
    customerId: number;
    customerName: string;
    totalSpent: number;
    leaseCount: number;
    refillCount: number;
  }>;
}

export class AnalyticsService {
  async getDashboardMetrics(outletId?: number): Promise<any> {
    const cylinderOutletFilter = outletId ? { currentOutletId: outletId } : {};
    const leaseOutletFilter = outletId ? { outletId } : {};

    // Get all required metrics
    const [
      totalOutlets,
      totalCylinders,
      totalCustomers,
      activeLeases,
      monthlyRevenue,
      todayRefills,
      todayRevenue,
      activeCylinders,
    ] = await Promise.all([
      outletId ? 1 : Outlet.count({ where: { status: 'active' } }),
      Cylinder.count({ where: cylinderOutletFilter }),
      User.count({ where: { role: CONSTANTS.USER_ROLES.CUSTOMER, paymentStatus: 'active' } }),
      LeaseRecord.count({ where: { ...leaseOutletFilter, leaseStatus: 'active' } }),
      this.getMonthlyRevenue(outletId),
      this.getTodayRefillsCount(outletId),
      this.getTodayRevenue(outletId),
      Cylinder.count({ where: { ...cylinderOutletFilter, status: 'leased' } }),
    ]);

    // Calculate revenue growth
    const lastMonthRevenue = await this.getLastMonthRevenue(outletId);
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    // Get structured recent activity
    const recentActivityData = await this.getStructuredRecentActivity(outletId);

    // Generate alerts
    const alerts = await this.generateSystemAlerts(outletId);

    return {
      summary: {
        totalOutlets,
        totalCylinders,
        activeCylinders,
        totalCustomers,
        activeLeases,
        todayRefills,
        revenue: {
          today: todayRevenue,
          thisMonth: monthlyRevenue,
          growth: Math.round(revenueGrowth * 100) / 100,
        },
      },
      recentActivity: recentActivityData,
      alerts,
    };
  }

  /**
   * Get analytics overview statistics
   */
  async getAnalyticsOverview(): Promise<any> {
    // Get date ranges
    const lastMonth = moment().subtract(1, 'month').startOf('month').toDate();
    const lastMonthEnd = moment().subtract(1, 'month').endOf('month').toDate();

    // Fetch all key metrics in parallel
    const [
      totalRevenue,
      monthlyRevenue,
      lastMonthRevenue,
      activeOutlets,
      utilizationRate,
      totalCylinders,
      availableCylinders,
      totalCustomers,
      retentionRate,
      activeOperators,
      avgOperatorEfficiency
    ] = await Promise.all([
      // Revenue metrics
      this.getTotalRevenue(),
      this.getMonthlyRevenue(),
      (await this.getLeaseRevenue(lastMonth, lastMonthEnd)) + (await this.getRefillRevenue(lastMonth, lastMonthEnd)),
      
      // Outlet metrics
      Outlet.count({ where: { status: 'active' } }),
      
      // Cylinder metrics
      this.getCylinderUtilizationRate(),
      Cylinder.count(),
      Cylinder.count({ where: { status: CONSTANTS.CYLINDER_STATUS.AVAILABLE } }),
      
      // Customer metrics
      User.count({ where: { role: CONSTANTS.USER_ROLES.CUSTOMER } }),
      this.getCustomerRetentionRate(),
      
      // Operator metrics
      User.count({ 
        where: { 
          role: CONSTANTS.USER_ROLES.REFILL_OPERATOR,
          isActive: true 
        } 
      }),
      this.getAverageOperatorEfficiency()
    ]);

    // Calculate growth rates
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    const avgOutletEfficiency = activeOutlets > 0 
      ? Math.round((utilizationRate / activeOutlets) * 100) 
      : 0;

    return {
      sections: [
        {
          title: 'Revenue Analytics',
          metrics: [
            { label: 'Total Revenue', value: `₦${(totalRevenue / 1000000).toFixed(1)}M` },
            { label: 'Growth Rate', value: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%` }
          ]
        },
        {
          title: 'Outlet Performance',
          metrics: [
            { label: 'Active Outlets', value: activeOutlets.toString() },
            { label: 'Avg. Efficiency', value: `${avgOutletEfficiency}%` }
          ]
        },
        {
          title: 'Cylinder Utilization',
          metrics: [
            { label: 'Utilization Rate', value: `${Math.round(utilizationRate)}%` },
            { label: 'Available', value: availableCylinders.toString() }
          ]
        },
        {
          title: 'Customer Analytics',
          metrics: [
            { label: 'Total Customers', value: totalCustomers.toLocaleString() },
            { label: 'Retention Rate', value: `${retentionRate}%` }
          ]
        },
        {
          title: 'Operator Performance',
          metrics: [
            { label: 'Active Operators', value: activeOperators.toString() },
            { label: 'Avg. Efficiency', value: `${avgOperatorEfficiency}%` }
          ]
        }
      ],
      summary: {
        monthlyRevenue: `₦${(monthlyRevenue / 1000000).toFixed(1)}M`,
        totalCustomers: totalCustomers.toLocaleString(),
        activeCylinders: (totalCylinders - availableCylinders).toLocaleString(),
        activeOutlets: activeOutlets.toString()
      }
    };
  }

  async getAllOutletsPerformance(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any[]> {
    const outlets = await Outlet.findAll({ where: { status: 'active' } });
    
    const performances = await Promise.all(
      outlets.map(async (outlet) => {
        try {
          const outletId = outlet.getDataValue('id');
          if (!outletId) throw new Error('Outlet ID not found');
          
          const performance = await this.getOutletPerformance(
            outletId,
            dateFrom,
            dateTo
          );
          
          // Calculate growth rate
          const currentRevenue = performance.metrics.revenue;
          const previousRevenue = await this.getOutletRevenue(
            outletId,
            dateFrom ? moment(dateFrom).subtract(30, 'days').toDate() : moment().subtract(60, 'days').toDate(),
            dateFrom ? moment(dateFrom).subtract(1, 'day').toDate() : moment().subtract(31, 'days').toDate()
          );
          const growthRate = previousRevenue > 0 
            ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
            : 0;
          
          // Get trends data
          const trends = await this.getOutletTrends(
            outletId,
            dateFrom,
            dateTo
          );
          
          // Transform to match frontend expectations
          return {
            outletId: performance.outletId,
            outletName: performance.outletName,
            metrics: {
              totalCylinders: performance.metrics.totalCylinders,
              activeCylinders: performance.metrics.activeCylinders,
              utilizationRate: performance.metrics.cylinderTurnoverRate,
              monthlyLeases: performance.metrics.monthlyLeases,
              monthlyRefills: performance.metrics.monthlyRefills,
              monthlyRevenue: performance.metrics.revenue,
              growthRate: Math.round(growthRate * 100) / 100,
            },
            trends,
          };
        } catch (error) {
          // If individual outlet fails, return a default structure
          const fallbackOutletId = outlet.getDataValue('id');
          const fallbackOutletName = outlet.getDataValue('name');
          if (!fallbackOutletId || !fallbackOutletName) {
            throw new Error('Required outlet data not found');
          }
          
          return {
            outletId: fallbackOutletId,
            outletName: fallbackOutletName,
            metrics: {
              totalCylinders: 0,
              activeCylinders: 0,
              utilizationRate: 0,
              monthlyLeases: 0,
              monthlyRefills: 0,
              monthlyRevenue: 0,
              growthRate: 0,
            },
            trends: [],
          };
        }
      })
    );

    return performances;
  }

  async getOutletPerformance(
    outletId: number,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<OutletPerformance> {
    const outlet = await Outlet.findByPk(outletId);
    if (!outlet) {
      throw new Error('Outlet not found');
    }

    const dateFilter = this.getDateFilter(dateFrom, dateTo);

    // Metrics calculation
    const [
      totalCylinders,
      activeCylinders,
      monthlyLeases,
      monthlyReturns,
      monthlyRefills,
      revenue,
      topCustomers,
      cylinderBreakdown,
    ] = await Promise.all([
      Cylinder.count({ where: { currentOutletId: outletId } }),
      Cylinder.count({ where: { currentOutletId: outletId, status: 'available' } }),
      LeaseRecord.count({
        where: {
          outletId,
          leaseDate: dateFilter,
        },
      }),
      LeaseRecord.count({
        where: {
          outletId,
          actualReturnDate: dateFilter,
          leaseStatus: 'returned',
        },
      }),
      RefillRecord.count({
        where: {
          outletId,
          refillDate: dateFilter,
        },
      }),
      this.getOutletRevenue(outletId, dateFrom, dateTo),
      this.getTopCustomersByOutlet(outletId, 5),
      this.getCylinderTypeBreakdown(outletId),
    ]);

    const cylinderTurnoverRate = totalCylinders > 0 ? (monthlyLeases / totalCylinders) * 100 : 0;

    return {
      outletId,
      outletName: outlet.getDataValue('name'),
      metrics: {
        totalCylinders,
        activeCylinders,
        monthlyLeases,
        monthlyReturns,
        monthlyRefills,
        revenue,
        cylinderTurnoverRate: Math.round(cylinderTurnoverRate * 100) / 100,
      },
      topCustomers,
      cylinderBreakdown,
    };
  }

  async getCylinderUtilization(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any> {
    // Get cylinder counts by status
    const cylindersByStatus = await this.getCylinderStatusCounts();

    // Calculate overall utilization
    const totalCylinders = Object.values(cylindersByStatus).reduce((sum, count) => sum + count, 0);
    
    // Build summary object matching frontend expectations
    const summary = {
      total: totalCylinders,
      available: cylindersByStatus.available || 0,
      leased: cylindersByStatus.leased || 0,
      inRefill: cylindersByStatus.refilling || 0,
      maintenance: 0, // Backend doesn't track maintenance status
      damaged: cylindersByStatus.damaged || 0,
    };

    // Get utilization by type with detailed breakdown
    const utilizationByTypeData = await this.getDetailedUtilizationByType();

    // Get utilization by outlet with cylinder counts
    const utilizationByOutletData = await this.getDetailedUtilizationByOutlet();

    // Get trends data
    const trends = await this.getCylinderTrends(dateFrom, dateTo);

    return {
      summary,
      byType: utilizationByTypeData,
      byOutlet: utilizationByOutletData,
      trends,
    };
  }

  async getRevenueAnalytics(
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    dateFrom: Date,
    dateTo: Date,
    outletId?: number
  ): Promise<RevenueAnalytics> {
    // Total revenue components
    const [leaseRevenue, refillRevenue, depositRevenue] = await Promise.all([
      this.getLeaseRevenue(dateFrom, dateTo, outletId),
      this.getRefillRevenue(dateFrom, dateTo, outletId),
      this.getDepositRevenue(dateFrom, dateTo, outletId),
    ]);

    const totalRevenue = leaseRevenue + refillRevenue + depositRevenue;

    // Calculate growth rate
    const growthRate = await this.getRevenueGrowthRate(dateFrom, dateTo, outletId);

    // Get transaction count and calculate average
    const transactionCount = await this.getTransactionCount(dateFrom, dateTo, outletId);
    const averageTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    // Revenue by outlet with detailed breakdown
    const byOutlet = await this.getDetailedRevenueByOutlet(dateFrom, dateTo);

    // Revenue by period (daily/weekly/monthly)
    const byPeriod = await this.getRevenueByPeriod(period, dateFrom, dateTo, outletId);

    // Top customers by revenue
    const topCustomers = await this.getTopCustomersByRevenue(dateFrom, dateTo, 10);

    return {
      summary: {
        totalRevenue,
        leaseRevenue,
        refillRevenue,
        growthRate,
        averageTransaction: Math.round(averageTransaction * 100) / 100,
      },
      byOutlet,
      byPeriod,
      topCustomers,
    };
  }

  async getCustomerAnalytics(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any> {
    const dateFilter = this.getDateFilter(dateFrom, dateTo);

    const [totalCustomers, activeCustomers, newCustomers, inactiveCustomers] =
      await Promise.all([
        User.count({ where: { role: CONSTANTS.USER_ROLES.CUSTOMER } }),
        this.getActiveCustomerCount(dateFrom, dateTo),
        User.count({
          where: {
            role: CONSTANTS.USER_ROLES.CUSTOMER,
            createdAt: dateFilter,
          },
        }),
        this.getInactiveCustomerCount(dateFrom, dateTo),
      ]);

    // Calculate metrics
    const churnRate = totalCustomers > 0 ? (inactiveCustomers / totalCustomers) * 100 : 0;
    const retentionRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;
    const averageLifetimeValue = await this.getAverageCustomerLifetimeValue();

    // Get segments data
    const segments = await this.getCustomerSegments(totalCustomers, activeCustomers, newCustomers, inactiveCustomers);

    // Get growth trend
    const growth = await this.getCustomerGrowthTrend(dateFrom, dateTo);

    // Get enhanced top customers
    const topCustomers = await this.getEnhancedTopCustomers(dateFrom, dateTo, 10);

    return {
      summary: {
        totalCustomers,
        activeCustomers,
        newCustomers,
        churnRate: Math.round(churnRate * 100) / 100,
        retentionRate: Math.round(retentionRate * 100) / 100,
        averageLifetimeValue: Math.round(averageLifetimeValue * 100) / 100,
      },
      segments,
      growth,
      topCustomers,
    };
  }

  /**
   * Get all operators with metrics
   */
  async getAllOperatorsWithMetrics(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any> {
    const from = dateFrom || moment().subtract(30, 'days').toDate();
    const to = dateTo || moment().endOf('day').toDate();

    // Get all operators with their metrics
    const operators = await sequelize.query<any>(
      `
      SELECT 
        u.id as operatorId,
        CONCAT(u.first_name, ' ', u.last_name) as operatorName,
        o.name as outletName,
        COUNT(DISTINCT r.id) as totalRefills,
        COALESCE(SUM(r.refill_cost), 0) as revenueGenerated,
        COUNT(DISTINCT DATE(r.refill_date)) as workDays,
        4.5 as rating
      FROM users u
      LEFT JOIN outlets o ON u.outlet_id = o.id
      LEFT JOIN refill_records r ON r.operator_id = u.id
        AND r.refill_date BETWEEN '${moment(from).format('YYYY-MM-DD')}' 
        AND '${moment(to).format('YYYY-MM-DD')}'
      WHERE u.role = '${CONSTANTS.USER_ROLES.REFILL_OPERATOR}'
      GROUP BY u.id, o.id
      ORDER BY totalRefills DESC
    `,
      { type: QueryTypes.SELECT }
    );

    // Calculate ranks and additional metrics
    const operatorsWithRanks = operators.map((op, index) => {
      const avgRefillsPerDay = op.workDays > 0 ? op.totalRefills / op.workDays : 0;
      const efficiency = Math.min(100, Math.round((avgRefillsPerDay / 20) * 100)); // 20 refills/day = 100%
      
      return {
        rank: index + 1,
        operatorId: op.operatorId,
        operatorName: op.operatorName,
        outletName: op.outletName || 'Unassigned',
        totalRefills: Number(op.totalRefills),
        efficiency,
        rating: Math.round(Number(op.rating) * 10) / 10, // Round to 1 decimal
        revenueGenerated: Number(op.revenueGenerated),
        avgRefillsPerDay: Math.round(avgRefillsPerDay * 10) / 10
      };
    });

    // Calculate aggregate metrics
    const totalOperators = operators.length;
    const activeOperators = operators.filter(op => op.totalRefills > 0).length;
    const avgRefillsPerOperator = totalOperators > 0 
      ? operators.reduce((sum, op) => sum + Number(op.totalRefills), 0) / totalOperators 
      : 0;
    const avgEfficiency = totalOperators > 0
      ? operatorsWithRanks.reduce((sum, op) => sum + op.efficiency, 0) / totalOperators
      : 0;
    const totalRefillsToday = await RefillRecord.count({
      where: {
        refillDate: {
          [Op.gte]: moment().startOf('day').toDate(),
          [Op.lte]: moment().endOf('day').toDate()
        }
      }
    });

    return {
      summary: {
        totalOperators,
        activeOperators,
        averageRefillsPerDay: Math.round(avgRefillsPerOperator / 30 * 10) / 10, // Average over 30 days
        averageEfficiency: Math.round(avgEfficiency),
        totalRefillsToday
      },
      operators: operatorsWithRanks
    };
  }

  async getOperatorPerformance(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    operators: Array<{
      operatorId: number;
      operatorName: string;
      totalRefills: number;
      totalVolume: number;
      averageRefillTime: number;
      efficiency: number;
    }>;
    refillsByDay: Array<{
      date: string;
      refillCount: number;
    }>;
  }> {
    const operators = await sequelize.query<any>(
      `
      SELECT 
        u.id as operatorId,
        CONCAT(u.first_name, ' ', u.last_name) as operatorName,
        COUNT(r.id) as totalRefills,
        SUM(r.post_refill_volume - r.pre_refill_volume) as totalVolume,
        COUNT(DISTINCT DATE(r.refill_date)) as workDays
      FROM users u
      INNER JOIN refill_records r ON r.operator_id = u.id
      WHERE u.role = '${CONSTANTS.USER_ROLES.REFILL_OPERATOR}'
        ${dateFrom ? `AND r.refill_date >= '${moment(dateFrom).format('YYYY-MM-DD')}'` : ''}
        ${dateTo ? `AND r.refill_date <= '${moment(dateTo).format('YYYY-MM-DD')}'` : ''}
      GROUP BY u.id
      ORDER BY totalRefills DESC
    `,
      { type: QueryTypes.SELECT }
    );

    // Calculate efficiency (refills per work day)
    const operatorsWithEfficiency = operators.map((op) => ({
      ...op,
      totalRefills: Number(op.totalRefills),
      totalVolume: Number(op.totalVolume),
      averageRefillTime: 15, // Placeholder - would need actual time tracking
      efficiency: op.workDays > 0 ? Number(op.totalRefills) / Number(op.workDays) : 0,
    }));

    // Refills by day
    const refillsByDay = await this.getRefillsByDay(dateFrom, dateTo);

    return {
      operators: operatorsWithEfficiency,
      refillsByDay,
    };
  }

  // Helper methods
  private getDateFilter(dateFrom?: Date, dateTo?: Date) {
    const filter: any = {};
    if (dateFrom || dateTo) {
      filter[Op.and] = [];
      if (dateFrom) filter[Op.and].push({ [Op.gte]: dateFrom });
      if (dateTo) filter[Op.and].push({ [Op.lte]: dateTo });
    }
    return filter;
  }

  private async getMonthlyRevenue(outletId?: number): Promise<number> {
    const startOfMonth = moment().startOf('month').toDate();
    const endOfMonth = moment().endOf('month').toDate();

    const [leaseRevenue, refillRevenue] = await Promise.all([
      this.getLeaseRevenue(startOfMonth, endOfMonth, outletId),
      this.getRefillRevenue(startOfMonth, endOfMonth, outletId),
    ]);

    return leaseRevenue + refillRevenue;
  }

  private async getLeaseRevenue(dateFrom: Date, dateTo: Date, outletId?: number): Promise<number> {
    const result = await LeaseRecord.sum('leaseAmount', {
      where: {
        ...(outletId ? { outletId } : {}),
        leaseDate: {
          [Op.between]: [dateFrom, dateTo],
        },
      },
    });
    return result || 0;
  }

  private async getRefillRevenue(dateFrom: Date, dateTo: Date, outletId?: number): Promise<number> {
    const result = await RefillRecord.sum('refillCost', {
      where: {
        ...(outletId ? { outletId } : {}),
        refillDate: {
          [Op.between]: [dateFrom, dateTo],
        },
      },
    });
    return result || 0;
  }

  private async getDepositRevenue(
    dateFrom: Date,
    dateTo: Date,
    outletId?: number
  ): Promise<number> {
    const result = await sequelize.query<any>(
      `
      SELECT SUM(deposit_amount - COALESCE(refund_amount, 0)) as depositRevenue
      FROM lease_records
      WHERE lease_status = 'returned'
        ${outletId ? `AND outlet_id = ${outletId}` : ''}
        AND actual_return_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
        AND '${moment(dateTo).format('YYYY-MM-DD')}'
    `,
      { type: QueryTypes.SELECT }
    );

    return Number(result[0]?.depositRevenue || 0);
  }

  private async getCylinderStatusCounts(outletId?: number): Promise<{
    available: number;
    leased: number;
    refilling: number;
    damaged: number;
    retired: number;
  }> {
    const where = outletId ? { currentOutletId: outletId } : {};

    const counts = (await Cylinder.findAll({
      where,
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    })) as any[];

    const statusCounts = counts.reduce(
      (acc, item) => {
        acc[item.status] = Number(item.count);
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      available: statusCounts.available || 0,
      leased: statusCounts.leased || 0,
      refilling: statusCounts.refilling || 0,
      damaged: statusCounts.damaged || 0,
      retired: statusCounts.retired || 0,
    };
  }

  // @ts-ignore - Unused method, kept for future functionality
  private async getTopPerformingOutlets(excludeOutletId?: number): Promise<any[]> {
    const startOfMonth = moment().startOf('month').toDate();

    const results = await sequelize.query<any>(
      `
      SELECT 
        o.id as outletId,
        o.name as outletName,
        COUNT(DISTINCT l.id) as activeLeases,
        COALESCE(SUM(l.lease_amount), 0) as monthlyRevenue
      FROM outlets o
      LEFT JOIN lease_records l ON l.outlet_id = o.id 
        AND l.lease_date >= '${moment(startOfMonth).format('YYYY-MM-DD')}'
      WHERE o.status = 'active'
        ${excludeOutletId ? `AND o.id != ${excludeOutletId}` : ''}
      GROUP BY o.id
      ORDER BY monthlyRevenue DESC
      LIMIT 5
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      outletId: r.outletId,
      outletName: r.outletName,
      activeLeases: Number(r.activeLeases),
      monthlyRevenue: Number(r.monthlyRevenue),
    }));
  }

  private async getStructuredRecentActivity(outletId?: number): Promise<{ leases: any[], refills: any[] }> {
    // Recent leases
    const recentLeases = await LeaseRecord.findAll({
      where: outletId ? { outletId } : {},
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [
        { model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName'] },
        { model: Cylinder, as: 'cylinder', attributes: ['id', 'cylinderCode'] },
        { model: Outlet, as: 'outlet', attributes: ['id', 'name'] },
      ],
    });

    const leases = recentLeases.map((lease) => {
      const customer = lease.get('customer') as any;
      const cylinder = lease.get('cylinder') as any;
      const outlet = lease.get('outlet') as any;
      
      return {
        id: lease.getDataValue('id'),
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        cylinderId: cylinder.id,
        cylinderCode: cylinder.cylinderCode,
        outletId: outlet.id,
        outletName: outlet.name,
        leaseDate: moment(lease.getDataValue('leaseDate')).format('YYYY-MM-DD HH:mm:ss'),
        amount: lease.getDataValue('leaseAmount'),
      };
    });

    // Recent refills
    const recentRefills = await RefillRecord.findAll({
      where: outletId ? { outletId } : {},
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [
        { model: User, as: 'operator', attributes: ['id', 'firstName', 'lastName'] },
        { model: Cylinder, as: 'cylinder', attributes: ['id', 'cylinderCode'] },
      ],
    });

    const refills = recentRefills.map((refill) => {
      const operator = refill.get('operator') as any;
      const cylinder = refill.get('cylinder') as any;
      
      return {
        id: refill.getDataValue('id'),
        cylinderId: cylinder.id,
        cylinderCode: cylinder.cylinderCode,
        operatorId: operator.id,
        operatorName: `${operator.firstName} ${operator.lastName}`,
        refillDate: moment(refill.getDataValue('refillDate')).format('YYYY-MM-DD HH:mm:ss'),
        volume: refill.getDataValue('postRefillVolume') - refill.getDataValue('preRefillVolume'),
        cost: refill.getDataValue('refillCost'),
      };
    });

    return { leases, refills };
  }

  private async getOutletRevenue(
    outletId: number,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<number> {
    const from = dateFrom || moment().startOf('month').toDate();
    const to = dateTo || moment().endOf('month').toDate();

    const [leaseRevenue, refillRevenue] = await Promise.all([
      this.getLeaseRevenue(from, to, outletId),
      this.getRefillRevenue(from, to, outletId),
    ]);

    return leaseRevenue + refillRevenue;
  }

  private async getTopCustomersByOutlet(outletId: number, limit: number = 5): Promise<any[]> {
    const results = await sequelize.query<any>(
      `
      SELECT 
        u.id as customerId,
        CONCAT(u.first_name, ' ', u.last_name) as customerName,
        COUNT(CASE WHEN l.lease_status = 'active' THEN 1 END) as activeLeases,
        COALESCE(SUM(l.lease_amount), 0) as totalSpent
      FROM users u
      INNER JOIN lease_records l ON l.customer_id = u.id
      WHERE l.outlet_id = ${outletId}
        AND u.role = '${CONSTANTS.USER_ROLES.CUSTOMER}'
      GROUP BY u.id
      ORDER BY totalSpent DESC
      LIMIT ${limit}
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      customerId: r.customerId,
      customerName: r.customerName,
      activeLeases: Number(r.activeLeases),
      totalSpent: Number(r.totalSpent),
    }));
  }

  private async getCylinderTypeBreakdown(outletId: number): Promise<Record<string, number>> {
    const counts = (await Cylinder.findAll({
      where: { currentOutletId: outletId },
      attributes: ['type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['type'],
      raw: true,
    })) as any[];

    return counts.reduce(
      (acc, item) => {
        acc[item.type] = Number(item.count);
        return acc;
      },
      {} as Record<string, number>
    );
  }

  // @ts-ignore - Unused method, kept for future functionality
  private async getAverageLeaseDuration(dateFrom?: Date, dateTo?: Date): Promise<number> {
    const where: any = { leaseStatus: 'returned' };
    if (dateFrom || dateTo) {
      where.actualReturnDate = this.getDateFilter(dateFrom, dateTo);
    }

    const result = await sequelize.query<any>(
      `
      SELECT AVG(DATEDIFF(actual_return_date, lease_date)) as avgDuration
      FROM lease_records
      WHERE lease_status = 'returned'
        AND actual_return_date IS NOT NULL
        ${dateFrom ? `AND actual_return_date >= '${moment(dateFrom).format('YYYY-MM-DD')}'` : ''}
        ${dateTo ? `AND actual_return_date <= '${moment(dateTo).format('YYYY-MM-DD')}'` : ''}
    `,
      { type: QueryTypes.SELECT }
    );

    return Math.round(Number(result[0]?.avgDuration || 0));
  }

  // @ts-ignore - Unused method, kept for future functionality
  private async getUtilizationByType(): Promise<Record<string, number>> {
    const results = await sequelize.query<any>(
      `
      SELECT 
        c.type,
        COUNT(c.id) as total,
        COUNT(CASE WHEN c.status != 'available' THEN 1 END) as utilized
      FROM cylinders c
      GROUP BY c.type
    `,
      { type: QueryTypes.SELECT }
    );

    return results.reduce(
      (acc, item) => {
        const utilization = item.total > 0 ? (item.utilized / item.total) * 100 : 0;
        acc[item.type] = Math.round(utilization * 100) / 100;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  // @ts-ignore - Unused method, kept for future functionality
  private async getUtilizationByOutlet(): Promise<any[]> {
    const results = await sequelize.query<any>(
      `
      SELECT 
        o.id as outletId,
        o.name as outletName,
        COUNT(c.id) as total,
        COUNT(CASE WHEN c.status != 'available' THEN 1 END) as utilized
      FROM outlets o
      LEFT JOIN cylinders c ON c.current_outlet_id = o.id
      WHERE o.status = 'active'
      GROUP BY o.id
      ORDER BY o.name
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      outletId: r.outletId,
      outletName: r.outletName,
      utilizationRate: r.total > 0 ? Math.round((r.utilized / r.total) * 100 * 100) / 100 : 0,
    }));
  }

  // @ts-ignore - Unused method, kept for future functionality
  private async getRevenueByOutlet(dateFrom: Date, dateTo: Date): Promise<any[]> {
    const results = await sequelize.query<any>(
      `
      SELECT 
        o.id as outletId,
        o.name as outletName,
        COALESCE(SUM(l.lease_amount), 0) + COALESCE(SUM(r.refill_cost), 0) as revenue
      FROM outlets o
      LEFT JOIN lease_records l ON l.outlet_id = o.id
        AND l.lease_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
        AND '${moment(dateTo).format('YYYY-MM-DD')}'
      LEFT JOIN refill_records r ON r.outlet_id = o.id
        AND r.refill_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
        AND '${moment(dateTo).format('YYYY-MM-DD')}'
      WHERE o.status = 'active'
      GROUP BY o.id
      ORDER BY revenue DESC
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      outletId: r.outletId,
      outletName: r.outletName,
      revenue: Number(r.revenue),
    }));
  }

  // @ts-ignore - Unused method, kept for future functionality
  private async getDailyRevenueTrend(
    dateFrom: Date,
    dateTo: Date,
    outletId?: number
  ): Promise<any[]> {
    const results = await sequelize.query<any>(
      `
      SELECT 
        DATE(date_series.date) as date,
        COALESCE(SUM(daily_revenue.revenue), 0) as revenue
      FROM (
        SELECT DATE(lease_date) as date, SUM(lease_amount) as revenue
        FROM lease_records l
        WHERE lease_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
          AND '${moment(dateTo).format('YYYY-MM-DD')}'
          ${outletId ? `AND outlet_id = ${outletId}` : ''}
        GROUP BY DATE(lease_date)
        
        UNION ALL
        
        SELECT DATE(refill_date) as date, SUM(refill_cost) as revenue
        FROM refill_records r
        WHERE refill_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
          AND '${moment(dateTo).format('YYYY-MM-DD')}'
          ${outletId ? `AND outlet_id = ${outletId}` : ''}
        GROUP BY DATE(refill_date)
      ) as daily_revenue
      RIGHT JOIN (
        SELECT DATE('${moment(dateFrom).format('YYYY-MM-DD')}' + INTERVAL seq DAY) as date
        FROM (
          SELECT a.N + b.N * 10 + c.N * 100 as seq
          FROM (SELECT 0 as N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
                UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a
          CROSS JOIN (SELECT 0 as N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
                      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
          CROSS JOIN (SELECT 0 as N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3) c
        ) seq_table
        WHERE DATE('${moment(dateFrom).format('YYYY-MM-DD')}' + INTERVAL seq DAY) <= '${moment(dateTo).format('YYYY-MM-DD')}'
      ) as date_series ON DATE(daily_revenue.date) = DATE(date_series.date)
      GROUP BY DATE(date_series.date)
      ORDER BY date
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      date: moment(r.date).format('YYYY-MM-DD'),
      revenue: Number(r.revenue),
    }));
  }

  private async getActiveCustomerCount(dateFrom?: Date, dateTo?: Date): Promise<number> {
    const where = `
      WHERE u.role = '${CONSTANTS.USER_ROLES.CUSTOMER}'
      AND EXISTS (
        SELECT 1 FROM lease_records l 
        WHERE l.customer_id = u.id
        ${dateFrom ? `AND l.lease_date >= '${moment(dateFrom).format('YYYY-MM-DD')}'` : ''}
        ${dateTo ? `AND l.lease_date <= '${moment(dateTo).format('YYYY-MM-DD')}'` : ''}
      )
    `;

    const result = await sequelize.query<any>(
      `
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      ${where}
    `,
      { type: QueryTypes.SELECT }
    );

    return Number(result[0]?.count || 0);
  }

  // @ts-ignore - Unused method, kept for future functionality
  private async getTopCustomers(limit: number = 10): Promise<any[]> {
    const results = await sequelize.query<any>(
      `
      SELECT 
        u.id as customerId,
        CONCAT(u.first_name, ' ', u.last_name) as customerName,
        COUNT(l.id) as totalLeases,
        COALESCE(SUM(l.lease_amount), 0) as totalSpent,
        MAX(l.lease_date) as lastActivity
      FROM users u
      INNER JOIN lease_records l ON l.customer_id = u.id
      WHERE u.role = '${CONSTANTS.USER_ROLES.CUSTOMER}'
      GROUP BY u.id
      ORDER BY totalSpent DESC
      LIMIT ${limit}
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      customerId: r.customerId,
      customerName: r.customerName,
      totalLeases: Number(r.totalLeases),
      totalSpent: Number(r.totalSpent),
      lastActivity: new Date(r.lastActivity),
    }));
  }

  // @ts-ignore - Unused method, kept for future functionality
  private async getCustomersByOutlet(): Promise<any[]> {
    const results = await sequelize.query<any>(
      `
      SELECT 
        o.id as outletId,
        o.name as outletName,
        COUNT(DISTINCT l.customer_id) as customerCount
      FROM outlets o
      LEFT JOIN lease_records l ON l.outlet_id = o.id
      WHERE o.status = 'active'
      GROUP BY o.id
      ORDER BY customerCount DESC
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      outletId: r.outletId,
      outletName: r.outletName,
      customerCount: Number(r.customerCount),
    }));
  }

  private async getRefillsByDay(dateFrom?: Date, dateTo?: Date): Promise<any[]> {
    const from = dateFrom || moment().subtract(30, 'days').toDate();
    const to = dateTo || new Date();

    const results = await sequelize.query<any>(
      `
      SELECT 
        DATE(refill_date) as date,
        COUNT(*) as refillCount
      FROM refill_records
      WHERE refill_date BETWEEN '${moment(from).format('YYYY-MM-DD')}' 
        AND '${moment(to).format('YYYY-MM-DD')}'
      GROUP BY DATE(refill_date)
      ORDER BY date
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      date: moment(r.date).format('YYYY-MM-DD'),
      refillCount: Number(r.refillCount),
    }));
  }

  private async getRevenueGrowthRate(
    dateFrom: Date,
    dateTo: Date,
    outletId?: number
  ): Promise<number> {
    // Get current period revenue
    const [currentLeaseRevenue, currentRefillRevenue] = await Promise.all([
      this.getLeaseRevenue(dateFrom, dateTo, outletId),
      this.getRefillRevenue(dateFrom, dateTo, outletId),
    ]);
    const currentPeriodRevenue = currentLeaseRevenue + currentRefillRevenue;
    
    // Get previous period revenue
    const daysDiff = moment(dateTo).diff(moment(dateFrom), 'days');
    const previousFrom = moment(dateFrom).subtract(daysDiff, 'days').toDate();
    const previousTo = moment(dateFrom).subtract(1, 'day').toDate();
    
    const [previousLeaseRevenue, previousRefillRevenue] = await Promise.all([
      this.getLeaseRevenue(previousFrom, previousTo, outletId),
      this.getRefillRevenue(previousFrom, previousTo, outletId),
    ]);
    
    const previousPeriodRevenue = previousLeaseRevenue + previousRefillRevenue;
    
    if (previousPeriodRevenue === 0) return 0;
    
    const growthRate = ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100;
    return Math.round(growthRate * 100) / 100;
  }

  private async getTransactionCount(
    dateFrom: Date,
    dateTo: Date,
    outletId?: number
  ): Promise<number> {
    const outletFilter = outletId ? `AND outlet_id = ${outletId}` : '';
    
    const result = await sequelize.query<any>(
      `
      SELECT 
        (SELECT COUNT(*) FROM lease_records 
         WHERE lease_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
         AND '${moment(dateTo).format('YYYY-MM-DD')}' ${outletFilter}) +
        (SELECT COUNT(*) FROM refill_records 
         WHERE refill_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
         AND '${moment(dateTo).format('YYYY-MM-DD')}' ${outletFilter}) as total
    `,
      { type: QueryTypes.SELECT }
    );
    
    return Number(result[0]?.total || 0);
  }

  private async getDetailedRevenueByOutlet(dateFrom: Date, dateTo: Date): Promise<any[]> {
    const results = await sequelize.query<any>(
      `
      SELECT 
        o.id as outletId,
        o.name as outletName,
        COALESCE(l.lease_revenue, 0) as leaseRevenue,
        COALESCE(r.refill_revenue, 0) as refillRevenue,
        COALESCE(l.lease_revenue, 0) + COALESCE(r.refill_revenue, 0) as revenue,
        COALESCE(l.lease_count, 0) + COALESCE(r.refill_count, 0) as transactionCount
      FROM outlets o
      LEFT JOIN (
        SELECT 
          outlet_id,
          SUM(lease_amount) as lease_revenue,
          COUNT(*) as lease_count
        FROM lease_records
        WHERE lease_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
          AND '${moment(dateTo).format('YYYY-MM-DD')}'
        GROUP BY outlet_id
      ) l ON l.outlet_id = o.id
      LEFT JOIN (
        SELECT 
          outlet_id,
          SUM(refill_cost) as refill_revenue,
          COUNT(*) as refill_count
        FROM refill_records
        WHERE refill_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
          AND '${moment(dateTo).format('YYYY-MM-DD')}'
        GROUP BY outlet_id
      ) r ON r.outlet_id = o.id
      WHERE o.status = 'active'
      ORDER BY revenue DESC
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      outletId: r.outletId,
      outletName: r.outletName,
      revenue: Number(r.revenue),
      leaseRevenue: Number(r.leaseRevenue),
      refillRevenue: Number(r.refillRevenue),
      transactionCount: Number(r.transactionCount),
    }));
  }

  private async getRevenueByPeriod(
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    dateFrom: Date,
    dateTo: Date,
    outletId?: number
  ): Promise<any[]> {
    const outletFilter = outletId ? `AND outlet_id = ${outletId}` : '';
    
    let dateFormat: string;
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateFormat = '%Y-%u';
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        break;
      case 'yearly':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m-%d'; // Default to daily
        break;
    }

    const results = await sequelize.query<any>(
      `
      SELECT 
        DATE_FORMAT(transaction_date, '${dateFormat}') as period,
        SUM(revenue) as revenue,
        SUM(lease_revenue) as leaseRevenue,
        SUM(refill_revenue) as refillRevenue,
        COUNT(*) as transactionCount
      FROM (
        SELECT 
          lease_date as transaction_date,
          lease_amount as revenue,
          lease_amount as lease_revenue,
          0 as refill_revenue
        FROM lease_records
        WHERE lease_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
          AND '${moment(dateTo).format('YYYY-MM-DD')}' ${outletFilter}
        
        UNION ALL
        
        SELECT 
          refill_date as transaction_date,
          refill_cost as revenue,
          0 as lease_revenue,
          refill_cost as refill_revenue
        FROM refill_records
        WHERE refill_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
          AND '${moment(dateTo).format('YYYY-MM-DD')}' ${outletFilter}
      ) as combined
      GROUP BY period
      ORDER BY period
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      period: r.period,
      revenue: Number(r.revenue),
      leaseRevenue: Number(r.leaseRevenue),
      refillRevenue: Number(r.refillRevenue),
      transactionCount: Number(r.transactionCount),
    }));
  }

  private async getOutletTrends(
    outletId: number,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any[]> {
    const from = dateFrom || moment().subtract(30, 'days').toDate();
    const to = dateTo || new Date();

    const results = await sequelize.query<any>(
      `
      SELECT 
        DATE(transaction_date) as date,
        COUNT(DISTINCT CASE WHEN transaction_type = 'lease' THEN transaction_id END) as leases,
        COUNT(DISTINCT CASE WHEN transaction_type = 'refill' THEN transaction_id END) as refills,
        SUM(revenue) as revenue
      FROM (
        SELECT 
          l.id as transaction_id,
          'lease' as transaction_type,
          l.lease_date as transaction_date,
          l.lease_amount as revenue
        FROM lease_records l
        WHERE l.outlet_id = ${outletId}
          AND l.lease_date BETWEEN '${moment(from).format('YYYY-MM-DD')}' 
          AND '${moment(to).format('YYYY-MM-DD')}'
        
        UNION ALL
        
        SELECT 
          r.id as transaction_id,
          'refill' as transaction_type,
          r.refill_date as transaction_date,
          r.refill_cost as revenue
        FROM refill_records r
        WHERE r.outlet_id = ${outletId}
          AND r.refill_date BETWEEN '${moment(from).format('YYYY-MM-DD')}' 
          AND '${moment(to).format('YYYY-MM-DD')}'
      ) as combined
      GROUP BY DATE(transaction_date)
      ORDER BY date
      LIMIT 30
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      date: moment(r.date).format('YYYY-MM-DD'),
      leases: Number(r.leases),
      refills: Number(r.refills),
      revenue: Number(r.revenue),
    }));
  }

  private async getDetailedUtilizationByType(): Promise<any[]> {
    const results = await sequelize.query<any>(
      `
      SELECT 
        c.type,
        COUNT(c.id) as total,
        COUNT(CASE WHEN c.status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN c.status = 'leased' THEN 1 END) as leased
      FROM cylinders c
      GROUP BY c.type
      ORDER BY c.type
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      type: r.type,
      total: Number(r.total),
      available: Number(r.available),
      leased: Number(r.leased),
      utilizationRate: r.total > 0 ? Math.round(((r.total - r.available) / r.total) * 100 * 100) / 100 : 0,
    }));
  }

  private async getDetailedUtilizationByOutlet(): Promise<any[]> {
    const results = await sequelize.query<any>(
      `
      SELECT 
        o.id as outletId,
        o.name as outletName,
        COUNT(c.id) as total,
        COUNT(CASE WHEN c.status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN c.status = 'leased' THEN 1 END) as leased
      FROM outlets o
      LEFT JOIN cylinders c ON c.current_outlet_id = o.id
      WHERE o.status = 'active'
      GROUP BY o.id
      ORDER BY o.name
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      outletId: r.outletId,
      outletName: r.outletName,
      total: Number(r.total),
      available: Number(r.available),
      leased: Number(r.leased),
      utilizationRate: r.total > 0 ? Math.round(((r.total - r.available) / r.total) * 100 * 100) / 100 : 0,
    }));
  }

  private async getCylinderTrends(dateFrom?: Date, dateTo?: Date): Promise<any[]> {
    const from = dateFrom || moment().subtract(30, 'days').toDate();
    const to = dateTo || new Date();

    const results = await sequelize.query<any>(
      `
      SELECT 
        DATE(date_series.date) as date,
        (SELECT COUNT(*) FROM cylinders WHERE status = 'available' 
         AND DATE(updated_at) <= DATE(date_series.date)) as available,
        (SELECT COUNT(*) FROM cylinders WHERE status = 'leased' 
         AND DATE(updated_at) <= DATE(date_series.date)) as leased,
        (SELECT COUNT(*) FROM cylinders WHERE status = 'refilling' 
         AND DATE(updated_at) <= DATE(date_series.date)) as inRefill
      FROM (
        SELECT DATE('${moment(from).format('YYYY-MM-DD')}' + INTERVAL seq DAY) as date
        FROM (
          SELECT a.N + b.N * 10 as seq
          FROM (SELECT 0 as N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
                UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a
          CROSS JOIN (SELECT 0 as N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3) b
        ) seq_table
        WHERE DATE('${moment(from).format('YYYY-MM-DD')}' + INTERVAL seq DAY) <= '${moment(to).format('YYYY-MM-DD')}'
      ) as date_series
      ORDER BY date
      LIMIT 30
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      date: moment(r.date).format('YYYY-MM-DD'),
      available: Number(r.available),
      leased: Number(r.leased),
      inRefill: Number(r.inRefill),
    }));
  }

  private async getInactiveCustomerCount(dateFrom?: Date, dateTo?: Date): Promise<number> {
    const where = `
      WHERE u.role = '${CONSTANTS.USER_ROLES.CUSTOMER}'
      AND NOT EXISTS (
        SELECT 1 FROM lease_records l 
        WHERE l.customer_id = u.id
        ${dateFrom ? `AND l.lease_date >= '${moment(dateFrom).format('YYYY-MM-DD')}'` : ''}
        ${dateTo ? `AND l.lease_date <= '${moment(dateTo).format('YYYY-MM-DD')}'` : ''}
      )
    `;

    const result = await sequelize.query<any>(
      `
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      ${where}
    `,
      { type: QueryTypes.SELECT }
    );

    return Number(result[0]?.count || 0);
  }

  private async getAverageCustomerLifetimeValue(): Promise<number> {
    const result = await sequelize.query<any>(
      `
      SELECT AVG(customer_value) as avgValue
      FROM (
        SELECT 
          u.id,
          COALESCE(SUM(l.lease_amount), 0) + COALESCE(SUM(r.refill_cost), 0) as customer_value
        FROM users u
        LEFT JOIN lease_records l ON l.customer_id = u.id
        LEFT JOIN refill_records r ON r.operator_id = u.id
        WHERE u.role = '${CONSTANTS.USER_ROLES.CUSTOMER}'
        GROUP BY u.id
      ) as customer_values
    `,
      { type: QueryTypes.SELECT }
    );

    return Number(result[0]?.avgValue || 0);
  }

  private async getCustomerSegments(
    totalCustomers: number,
    activeCustomers: number,
    newCustomers: number,
    inactiveCustomers: number
  ): Promise<any[]> {
    const churnedCustomers = Math.max(0, totalCustomers - activeCustomers - inactiveCustomers - newCustomers);
    
    const segments = [
      {
        segment: 'active',
        count: activeCustomers,
        percentage: totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0,
        averageValue: await this.getAverageValueBySegment('active'),
      },
      {
        segment: 'inactive',
        count: inactiveCustomers,
        percentage: totalCustomers > 0 ? (inactiveCustomers / totalCustomers) * 100 : 0,
        averageValue: await this.getAverageValueBySegment('inactive'),
      },
      {
        segment: 'new',
        count: newCustomers,
        percentage: totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0,
        averageValue: await this.getAverageValueBySegment('new'),
      },
      {
        segment: 'churned',
        count: churnedCustomers,
        percentage: totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0,
        averageValue: 0,
      },
    ];

    return segments;
  }

  private async getAverageValueBySegment(segment: string): Promise<number> {
    let whereClause = '';
    
    switch (segment) {
      case 'active':
        whereClause = `AND EXISTS (
          SELECT 1 FROM lease_records l 
          WHERE l.customer_id = u.id 
          AND l.lease_date >= '${moment().subtract(30, 'days').format('YYYY-MM-DD')}'
        )`;
        break;
      case 'inactive':
        whereClause = `AND NOT EXISTS (
          SELECT 1 FROM lease_records l 
          WHERE l.customer_id = u.id 
          AND l.lease_date >= '${moment().subtract(90, 'days').format('YYYY-MM-DD')}'
        )`;
        break;
      case 'new':
        whereClause = `AND u.created_at >= '${moment().subtract(30, 'days').format('YYYY-MM-DD')}'`;
        break;
    }

    const result = await sequelize.query<any>(
      `
      SELECT AVG(customer_value) as avgValue
      FROM (
        SELECT 
          u.id,
          COALESCE(SUM(l.lease_amount), 0) as customer_value
        FROM users u
        LEFT JOIN lease_records l ON l.customer_id = u.id
        WHERE u.role = '${CONSTANTS.USER_ROLES.CUSTOMER}'
        ${whereClause}
        GROUP BY u.id
      ) as segment_values
    `,
      { type: QueryTypes.SELECT }
    );

    return Number(result[0]?.avgValue || 0);
  }

  private async getCustomerGrowthTrend(dateFrom?: Date, dateTo?: Date): Promise<any[]> {
    const from = dateFrom || moment().subtract(30, 'days').toDate();
    const to = dateTo || new Date();

    const results = await sequelize.query<any>(
      `
      SELECT 
        DATE(date_series.date) as date,
        (SELECT COUNT(*) FROM users 
         WHERE role = '${CONSTANTS.USER_ROLES.CUSTOMER}' 
         AND DATE(created_at) <= DATE(date_series.date)) as totalCustomers,
        (SELECT COUNT(*) FROM users 
         WHERE role = '${CONSTANTS.USER_ROLES.CUSTOMER}' 
         AND DATE(created_at) = DATE(date_series.date)) as newCustomers,
        (SELECT COUNT(DISTINCT customer_id) FROM lease_records 
         WHERE DATE(lease_date) = DATE(date_series.date)) as activeCustomers
      FROM (
        SELECT DATE('${moment(from).format('YYYY-MM-DD')}' + INTERVAL seq DAY) as date
        FROM (
          SELECT a.N + b.N * 10 as seq
          FROM (SELECT 0 as N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
                UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a
          CROSS JOIN (SELECT 0 as N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3) b
        ) seq_table
        WHERE DATE('${moment(from).format('YYYY-MM-DD')}' + INTERVAL seq DAY) <= '${moment(to).format('YYYY-MM-DD')}'
      ) as date_series
      ORDER BY date
      LIMIT 30
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      date: moment(r.date).format('YYYY-MM-DD'),
      totalCustomers: Number(r.totalCustomers),
      newCustomers: Number(r.newCustomers),
      activeCustomers: Number(r.activeCustomers),
    }));
  }

  private async getEnhancedTopCustomers(
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 10
  ): Promise<any[]> {
    const dateFilter = dateFrom && dateTo
      ? `AND l.lease_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
         AND '${moment(dateTo).format('YYYY-MM-DD')}'`
      : '';

    const results = await sequelize.query<any>(
      `
      SELECT 
        u.id as customerId,
        CONCAT(u.first_name, ' ', u.last_name) as customerName,
        u.created_at as joinDate,
        COUNT(DISTINCT l.id) as totalLeases,
        COUNT(DISTINCT r.id) as totalRefills,
        COALESCE(SUM(l.lease_amount), 0) + COALESCE(SUM(r.refill_cost), 0) as totalSpent,
        MAX(GREATEST(
          COALESCE(l.lease_date, '1970-01-01'),
          COALESCE(r.refill_date, '1970-01-01')
        )) as lastActivity
      FROM users u
      LEFT JOIN lease_records l ON l.customer_id = u.id ${dateFilter}
      LEFT JOIN refill_records r ON r.cylinder_id IN (
        SELECT cylinder_id FROM lease_records 
        WHERE customer_id = u.id AND lease_status = 'active'
      )
      WHERE u.role = '${CONSTANTS.USER_ROLES.CUSTOMER}'
      GROUP BY u.id
      HAVING totalSpent > 0
      ORDER BY totalSpent DESC
      LIMIT ${limit}
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      customerId: r.customerId,
      customerName: r.customerName,
      joinDate: moment(r.joinDate).format('YYYY-MM-DD'),
      totalLeases: Number(r.totalLeases),
      totalRefills: Number(r.totalRefills),
      totalSpent: Number(r.totalSpent),
      lastActivity: moment(r.lastActivity).format('YYYY-MM-DD'),
    }));
  }

  private async getTodayRefillsCount(outletId?: number): Promise<number> {
    const today = moment().startOf('day').toDate();
    const endOfToday = moment().endOf('day').toDate();
    
    return RefillRecord.count({
      where: {
        ...(outletId ? { outletId } : {}),
        refillDate: {
          [Op.between]: [today, endOfToday],
        },
      },
    });
  }

  private async getTodayRevenue(outletId?: number): Promise<number> {
    const today = moment().startOf('day').toDate();
    const endOfToday = moment().endOf('day').toDate();
    
    const [leaseRevenue, refillRevenue] = await Promise.all([
      this.getLeaseRevenue(today, endOfToday, outletId),
      this.getRefillRevenue(today, endOfToday, outletId),
    ]);
    
    return leaseRevenue + refillRevenue;
  }

  private async getLastMonthRevenue(outletId?: number): Promise<number> {
    const startOfLastMonth = moment().subtract(1, 'month').startOf('month').toDate();
    const endOfLastMonth = moment().subtract(1, 'month').endOf('month').toDate();
    
    const [leaseRevenue, refillRevenue] = await Promise.all([
      this.getLeaseRevenue(startOfLastMonth, endOfLastMonth, outletId),
      this.getRefillRevenue(startOfLastMonth, endOfLastMonth, outletId),
    ]);
    
    return leaseRevenue + refillRevenue;
  }

  private async generateSystemAlerts(outletId?: number): Promise<any[]> {
    const alerts: any[] = [];
    
    // Check for low cylinder availability
    const cylinderStatusCounts = await this.getCylinderStatusCounts(outletId);
    const totalCylinders = Object.values(cylinderStatusCounts).reduce((sum, count) => sum + count, 0);
    const availableRate = totalCylinders > 0 ? (cylinderStatusCounts.available / totalCylinders) * 100 : 0;
    
    if (availableRate < 20) {
      alerts.push({
        type: 'warning',
        title: 'Low Cylinder Availability',
        message: `Only ${availableRate.toFixed(1)}% of cylinders are available for lease`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Check for overdue leases
    const overdueLeasesCount = await LeaseRecord.count({
      where: {
        ...(outletId ? { outletId } : {}),
        leaseStatus: 'active',
        expectedReturnDate: {
          [Op.lt]: new Date(),
        },
      },
    });
    
    if (overdueLeasesCount > 0) {
      alerts.push({
        type: 'danger',
        title: 'Overdue Leases',
        message: `${overdueLeasesCount} cylinder leases are overdue for return`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Check for damaged cylinders
    if (cylinderStatusCounts.damaged > 5) {
      alerts.push({
        type: 'warning',
        title: 'Damaged Cylinders',
        message: `${cylinderStatusCounts.damaged} cylinders require maintenance or repair`,
        timestamp: new Date().toISOString(),
      });
    }
    
    return alerts;
  }

  private async getTopCustomersByRevenue(
    dateFrom: Date,
    dateTo: Date,
    limit: number = 10
  ): Promise<any[]> {
    const results = await sequelize.query<any>(
      `
      SELECT 
        u.id as customerId,
        CONCAT(u.first_name, ' ', u.last_name) as customerName,
        COALESCE(l.total_spent, 0) + COALESCE(r.total_spent, 0) as totalSpent,
        COALESCE(l.lease_count, 0) as leaseCount,
        COALESCE(r.refill_count, 0) as refillCount
      FROM users u
      LEFT JOIN (
        SELECT 
          customer_id,
          SUM(lease_amount) as total_spent,
          COUNT(*) as lease_count
        FROM lease_records
        WHERE lease_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
          AND '${moment(dateTo).format('YYYY-MM-DD')}'
        GROUP BY customer_id
      ) l ON l.customer_id = u.id
      LEFT JOIN (
        SELECT 
          lr.customer_id,
          SUM(rr.refill_cost) as total_spent,
          COUNT(DISTINCT rr.id) as refill_count
        FROM refill_records rr
        INNER JOIN lease_records lr ON lr.cylinder_id = rr.cylinder_id
          AND lr.lease_status = 'active'
          AND rr.refill_date BETWEEN lr.lease_date AND COALESCE(lr.actual_return_date, NOW())
        WHERE rr.refill_date BETWEEN '${moment(dateFrom).format('YYYY-MM-DD')}' 
          AND '${moment(dateTo).format('YYYY-MM-DD')}'
        GROUP BY lr.customer_id
      ) r ON r.customer_id = u.id
      WHERE u.role = '${CONSTANTS.USER_ROLES.CUSTOMER}'
        AND (l.total_spent > 0 OR r.total_spent > 0)
      ORDER BY totalSpent DESC
      LIMIT ${limit}
    `,
      { type: QueryTypes.SELECT }
    );

    return results.map((r) => ({
      customerId: r.customerId,
      customerName: r.customerName,
      totalSpent: Number(r.totalSpent),
      leaseCount: Number(r.leaseCount),
      refillCount: Number(r.refillCount),
    }));
  }

  private async getTotalRevenue(): Promise<number> {
    const [leaseRevenue, refillRevenue] = await Promise.all([
      LeaseRecord.sum('leaseAmount') || 0,
      RefillRecord.sum('refillCost') || 0,
    ]);
    return leaseRevenue + refillRevenue;
  }

  private async getCylinderUtilizationRate(): Promise<number> {
    const [total, available] = await Promise.all([
      Cylinder.count(),
      Cylinder.count({ where: { status: CONSTANTS.CYLINDER_STATUS.AVAILABLE } }),
    ]);
    return total > 0 ? ((total - available) / total) * 100 : 0;
  }

  private async getCustomerRetentionRate(): Promise<number> {
    const threeMonthsAgo = moment().subtract(3, 'months').toDate();
    
    // Get customers who had activity 6 months ago
    const oldCustomers = await sequelize.query<any>(
      `
      SELECT DISTINCT customer_id
      FROM lease_records
      WHERE lease_date < '${moment(threeMonthsAgo).format('YYYY-MM-DD')}'
    `,
      { type: QueryTypes.SELECT }
    );
    
    if (oldCustomers.length === 0) return 100;
    
    // Check how many of them are still active
    const activeOldCustomers = await sequelize.query<any>(
      `
      SELECT DISTINCT customer_id
      FROM lease_records
      WHERE customer_id IN (${oldCustomers.map(c => c.customer_id).join(',')})
        AND lease_date >= '${moment(threeMonthsAgo).format('YYYY-MM-DD')}'
    `,
      { type: QueryTypes.SELECT }
    );
    
    return Math.round((activeOldCustomers.length / oldCustomers.length) * 100);
  }

  private async getAverageOperatorEfficiency(): Promise<number> {
    const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
    
    const operatorStats = await sequelize.query<any>(
      `
      SELECT 
        u.id,
        COUNT(r.id) as refillCount,
        COUNT(DISTINCT DATE(r.refill_date)) as workDays
      FROM users u
      LEFT JOIN refill_records r ON r.operator_id = u.id
        AND r.refill_date >= '${moment(thirtyDaysAgo).format('YYYY-MM-DD')}'
      WHERE u.role = '${CONSTANTS.USER_ROLES.REFILL_OPERATOR}'
        AND u.is_active = true
      GROUP BY u.id
    `,
      { type: QueryTypes.SELECT }
    );
    
    if (operatorStats.length === 0) return 0;
    
    const avgRefillsPerDay = operatorStats.reduce((sum, op) => {
      const efficiency = op.workDays > 0 ? op.refillCount / op.workDays : 0;
      return sum + efficiency;
    }, 0) / operatorStats.length;
    
    // Assuming 20 refills per day is 100% efficiency
    return Math.min(100, Math.round((avgRefillsPerDay / 20) * 100));
  }
}

export const analyticsService = new AnalyticsService();
