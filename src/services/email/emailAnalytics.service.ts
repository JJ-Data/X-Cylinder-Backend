import { EmailLog, EmailStatus, EmailTemplate, EmailProvider } from '@models/EmailLog.model';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '@config/database';
import { logger } from '@utils/logger';

export interface EmailAnalyticsFilters {
  dateFrom?: Date;
  dateTo?: Date;
  templateType?: EmailTemplate;
  provider?: EmailProvider;
  status?: EmailStatus;
  campaignId?: string;
  entityType?: string;
  entityId?: number;
  userId?: number;
}

export interface EmailDeliveryMetrics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalFailed: number;
  deliveryRate: number; // %
  openRate: number; // %
  clickRate: number; // %
  bounceRate: number; // %
  failureRate: number; // %
}

export interface TemplatePerformanceMetrics {
  templateType: EmailTemplate;
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  averageClickCount: number;
  lastUsed: Date;
}

export interface ProviderPerformanceMetrics {
  provider: EmailProvider;
  totalSent: number;
  deliveryRate: number;
  averageDeliveryTime: number; // milliseconds
  failureRate: number;
  costEfficiency?: number; // emails per dollar, if cost data available
}

export interface EmailVolumeMetrics {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
}

export interface RecipientEngagementMetrics {
  recipient: string;
  recipientName?: string;
  totalEmailsReceived: number;
  totalOpened: number;
  totalClicked: number;
  averageOpenTime?: number; // hours after sending
  lastEngagement: Date;
  engagementRate: number; // %
  preferredTemplate?: EmailTemplate;
}

export interface CampaignAnalytics {
  campaignId: string;
  campaignName?: string;
  totalRecipients: number;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  deliveryMetrics: EmailDeliveryMetrics;
  topPerformingTemplate?: EmailTemplate;
  peakSendTime?: Date;
  recipientEngagement: {
    highEngagement: number; // >70% open rate
    mediumEngagement: number; // 30-70% open rate
    lowEngagement: number; // <30% open rate
    noEngagement: number; // 0% open rate
  };
}

export interface EmailTrendAnalysis {
  period: 'daily' | 'weekly' | 'monthly';
  metrics: Array<{
    date: string;
    sent: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  }>;
  trends: {
    sentTrend: 'improving' | 'declining' | 'stable';
    deliveryTrend: 'improving' | 'declining' | 'stable';
    engagementTrend: 'improving' | 'declining' | 'stable';
  };
}

export interface EmailHealthScore {
  overallScore: number; // 0-100
  deliveryHealth: number; // 0-100
  engagementHealth: number; // 0-100
  reputationHealth: number; // 0-100
  recommendations: string[];
  criticalIssues: string[];
}

export class EmailAnalyticsService {
  private static instance: EmailAnalyticsService;

  private constructor() {}

  public static getInstance(): EmailAnalyticsService {
    if (!EmailAnalyticsService.instance) {
      EmailAnalyticsService.instance = new EmailAnalyticsService();
    }
    return EmailAnalyticsService.instance;
  }

  /**
   * Get overall email delivery metrics
   */
  async getDeliveryMetrics(filters: EmailAnalyticsFilters = {}): Promise<EmailDeliveryMetrics> {
    try {
      const whereClause = this.buildWhereClause(filters);

      const results = await EmailLog.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', '*'), 'count'],
        ],
        where: whereClause,
        group: ['status'],
        raw: true,
      });

      const statusCounts = results.reduce((acc: Record<string, number>, result: any) => {
        acc[result.status] = parseInt(result.count);
        return acc;
      }, {});

      const totalSent = statusCounts[EmailStatus.SENT] || 0;
      const totalDelivered = statusCounts[EmailStatus.DELIVERED] || 0;
      const totalOpened = statusCounts[EmailStatus.OPENED] || 0;
      const totalClicked = statusCounts[EmailStatus.CLICKED] || 0;
      const totalBounced = statusCounts[EmailStatus.BOUNCED] || 0;
      const totalFailed = statusCounts[EmailStatus.FAILED] || 0;

      const totalProcessed = totalSent + totalFailed;
      const totalSuccessful = totalSent + totalDelivered + totalOpened + totalClicked;

      return {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        totalFailed,
        deliveryRate: totalProcessed > 0 ? (totalSuccessful / totalProcessed) * 100 : 0,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
        bounceRate: totalProcessed > 0 ? (totalBounced / totalProcessed) * 100 : 0,
        failureRate: totalProcessed > 0 ? (totalFailed / totalProcessed) * 100 : 0,
      };
    } catch (error) {
      logger.error('Failed to get delivery metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters,
      });
      throw error;
    }
  }

  /**
   * Get template performance metrics
   */
  async getTemplatePerformance(filters: EmailAnalyticsFilters = {}): Promise<TemplatePerformanceMetrics[]> {
    try {
      const whereClause = this.buildWhereClause(filters);

      const results = await sequelize.query(`
        SELECT 
          template_type,
          COUNT(*) as total_sent,
          AVG(CASE WHEN status IN ('delivered', 'opened', 'clicked') THEN 1 ELSE 0 END) * 100 as delivery_rate,
          AVG(CASE WHEN status IN ('opened', 'clicked') THEN 1 ELSE 0 END) * 100 as open_rate,
          AVG(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) * 100 as click_rate,
          AVG(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) * 100 as bounce_rate,
          AVG(COALESCE(click_count, 0)) as avg_click_count,
          MAX(created_at) as last_used
        FROM email_logs 
        WHERE ${this.buildSqlWhereClause(whereClause)}
        GROUP BY template_type
        ORDER BY total_sent DESC
      `, {
        type: QueryTypes.SELECT,
        raw: true,
      });

      return results.map((result: any) => ({
        templateType: result.template_type as EmailTemplate,
        totalSent: parseInt(result.total_sent),
        deliveryRate: parseFloat(result.delivery_rate) || 0,
        openRate: parseFloat(result.open_rate) || 0,
        clickRate: parseFloat(result.click_rate) || 0,
        bounceRate: parseFloat(result.bounce_rate) || 0,
        averageClickCount: parseFloat(result.avg_click_count) || 0,
        lastUsed: new Date(result.last_used),
      }));
    } catch (error) {
      logger.error('Failed to get template performance', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters,
      });
      throw error;
    }
  }

  /**
   * Get provider performance metrics
   */
  async getProviderPerformance(filters: EmailAnalyticsFilters = {}): Promise<ProviderPerformanceMetrics[]> {
    try {
      const whereClause = this.buildWhereClause(filters);

      const results = await sequelize.query(`
        SELECT 
          provider,
          COUNT(*) as total_sent,
          AVG(CASE WHEN status IN ('delivered', 'opened', 'clicked') THEN 1 ELSE 0 END) * 100 as delivery_rate,
          AVG(CASE WHEN sent_at IS NOT NULL AND delivered_at IS NOT NULL 
               THEN EXTRACT(EPOCH FROM (delivered_at - sent_at)) * 1000 
               ELSE NULL END) as avg_delivery_time,
          AVG(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) * 100 as failure_rate
        FROM email_logs 
        WHERE ${this.buildSqlWhereClause(whereClause)}
        GROUP BY provider
        ORDER BY total_sent DESC
      `, {
        type: QueryTypes.SELECT,
        raw: true,
      });

      return results.map((result: any) => ({
        provider: result.provider as EmailProvider,
        totalSent: parseInt(result.total_sent),
        deliveryRate: parseFloat(result.delivery_rate) || 0,
        averageDeliveryTime: parseFloat(result.avg_delivery_time) || 0,
        failureRate: parseFloat(result.failure_rate) || 0,
      }));
    } catch (error) {
      logger.error('Failed to get provider performance', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters,
      });
      throw error;
    }
  }

  /**
   * Get email volume metrics over time
   */
  async getVolumeMetrics(
    filters: EmailAnalyticsFilters = {},
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<EmailVolumeMetrics[]> {
    try {
      const whereClause = this.buildWhereClause(filters);
      let dateFormat: string;

      switch (groupBy) {
        case 'week':
          dateFormat = 'YYYY-WW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
      }

      const results = await sequelize.query(`
        SELECT 
          TO_CHAR(created_at, '${dateFormat}') as date,
          COUNT(*) as sent,
          COUNT(CASE WHEN status IN ('delivered', 'opened', 'clicked') THEN 1 END) as delivered,
          COUNT(CASE WHEN status IN ('opened', 'clicked') THEN 1 END) as opened,
          COUNT(CASE WHEN status = 'clicked' THEN 1 END) as clicked,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM email_logs 
        WHERE ${this.buildSqlWhereClause(whereClause)}
        GROUP BY TO_CHAR(created_at, '${dateFormat}')
        ORDER BY date ASC
      `, {
        type: QueryTypes.SELECT,
        raw: true,
      });

      return results.map((result: any) => ({
        date: result.date,
        sent: parseInt(result.sent),
        delivered: parseInt(result.delivered),
        opened: parseInt(result.opened),
        clicked: parseInt(result.clicked),
        failed: parseInt(result.failed),
      }));
    } catch (error) {
      logger.error('Failed to get volume metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters,
        groupBy,
      });
      throw error;
    }
  }

  /**
   * Get recipient engagement metrics
   */
  async getRecipientEngagement(
    filters: EmailAnalyticsFilters = {},
    limit: number = 100
  ): Promise<RecipientEngagementMetrics[]> {
    try {
      const whereClause = this.buildWhereClause(filters);

      const results = await sequelize.query(`
        SELECT 
          recipient,
          recipient_name,
          COUNT(*) as total_emails_received,
          COUNT(CASE WHEN status IN ('opened', 'clicked') THEN 1 END) as total_opened,
          COUNT(CASE WHEN status = 'clicked' THEN 1 END) as total_clicked,
          AVG(CASE WHEN opened_at IS NOT NULL AND sent_at IS NOT NULL 
               THEN EXTRACT(EPOCH FROM (opened_at - sent_at)) / 3600 
               ELSE NULL END) as avg_open_time_hours,
          MAX(GREATEST(opened_at, clicked_at, delivered_at, created_at)) as last_engagement,
          MODE() WITHIN GROUP (ORDER BY template_type) as preferred_template
        FROM email_logs 
        WHERE ${this.buildSqlWhereClause(whereClause)}
        GROUP BY recipient, recipient_name
        HAVING COUNT(*) > 0
        ORDER BY total_emails_received DESC
        LIMIT ${limit}
      `, {
        type: QueryTypes.SELECT,
        raw: true,
      });

      return results.map((result: any) => {
        const totalReceived = parseInt(result.total_emails_received);
        const totalOpened = parseInt(result.total_opened);
        
        return {
          recipient: result.recipient,
          recipientName: result.recipient_name,
          totalEmailsReceived: totalReceived,
          totalOpened,
          totalClicked: parseInt(result.total_clicked),
          averageOpenTime: parseFloat(result.avg_open_time_hours),
          lastEngagement: new Date(result.last_engagement),
          engagementRate: totalReceived > 0 ? (totalOpened / totalReceived) * 100 : 0,
          preferredTemplate: result.preferred_template as EmailTemplate,
        };
      });
    } catch (error) {
      logger.error('Failed to get recipient engagement', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    try {
      const campaignEmails = await EmailLog.findAll({
        where: { campaignId },
        order: [['created_at', 'ASC']],
      });

      if (campaignEmails.length === 0) {
        throw new Error(`No emails found for campaign: ${campaignId}`);
      }

      const firstEmailCreatedAt = campaignEmails[0]?.getDataValue('createdAt');
      const startTime = firstEmailCreatedAt ? new Date(firstEmailCreatedAt as string | Date) : new Date();
      const lastEmail = campaignEmails[campaignEmails.length - 1];
      const lastEmailSentAt = lastEmail?.getDataValue('sentAt');
      const lastEmailCreatedAt = lastEmail?.getDataValue('createdAt');
      const endTime = lastEmailSentAt || lastEmailCreatedAt;
      const duration = endTime ? new Date(endTime as string | Date).getTime() - startTime.getTime() : undefined;

      // Get delivery metrics for this campaign
      const deliveryMetrics = await this.getDeliveryMetrics({ campaignId });

      // Find top performing template
      const templatePerformance = await this.getTemplatePerformance({ campaignId });
      const topPerformingTemplate = templatePerformance.length > 0 
        ? templatePerformance.sort((a, b) => b.openRate - a.openRate)[0]?.templateType 
        : undefined;

      // Find peak send time
      const hourlyVolume = await sequelize.query(`
        SELECT 
          EXTRACT(HOUR FROM sent_at) as hour,
          COUNT(*) as count
        FROM email_logs 
        WHERE campaign_id = :campaignId AND sent_at IS NOT NULL
        GROUP BY EXTRACT(HOUR FROM sent_at)
        ORDER BY count DESC
        LIMIT 1
      `, {
        replacements: { campaignId },
        type: QueryTypes.SELECT,
        raw: true,
      });

      const peakSendTime = hourlyVolume.length > 0 
        ? new Date(startTime.getTime() + (hourlyVolume[0] as any).hour * 60 * 60 * 1000)
        : undefined;

      // Calculate recipient engagement levels
      const engagementLevels = await sequelize.query(`
        SELECT 
          CASE 
            WHEN engagement_rate > 70 THEN 'high'
            WHEN engagement_rate > 30 THEN 'medium'
            WHEN engagement_rate > 0 THEN 'low'
            ELSE 'none'
          END as engagement_level,
          COUNT(*) as count
        FROM (
          SELECT 
            recipient,
            (COUNT(CASE WHEN status IN ('opened', 'clicked') THEN 1 END) * 100.0 / COUNT(*)) as engagement_rate
          FROM email_logs 
          WHERE campaign_id = :campaignId
          GROUP BY recipient
        ) recipient_engagement
        GROUP BY engagement_level
      `, {
        replacements: { campaignId },
        type: QueryTypes.SELECT,
        raw: true,
      });

      const engagementCounts = engagementLevels.reduce((acc: any, level: any) => {
        acc[level.engagement_level] = parseInt(level.count);
        return acc;
      }, {});

      return {
        campaignId,
        totalRecipients: campaignEmails.length,
        startTime,
        endTime: endTime ? new Date(endTime) : undefined,
        duration,
        deliveryMetrics,
        topPerformingTemplate,
        peakSendTime,
        recipientEngagement: {
          highEngagement: engagementCounts.high || 0,
          mediumEngagement: engagementCounts.medium || 0,
          lowEngagement: engagementCounts.low || 0,
          noEngagement: engagementCounts.none || 0,
        },
      };
    } catch (error) {
      logger.error('Failed to get campaign analytics', {
        campaignId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get email trend analysis
   */
  async getTrendAnalysis(
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    filters: EmailAnalyticsFilters = {}
  ): Promise<EmailTrendAnalysis> {
    try {
      const volumeMetrics = await this.getVolumeMetrics(filters, period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month');

      const metrics = volumeMetrics.map(metric => ({
        date: metric.date,
        sent: metric.sent,
        deliveryRate: metric.sent > 0 ? (metric.delivered / metric.sent) * 100 : 0,
        openRate: metric.delivered > 0 ? (metric.opened / metric.delivered) * 100 : 0,
        clickRate: metric.opened > 0 ? (metric.clicked / metric.opened) * 100 : 0,
        bounceRate: metric.sent > 0 ? ((metric.sent - metric.delivered) / metric.sent) * 100 : 0,
      }));

      // Calculate trends (simplified trend analysis)
      const sentTrend = this.calculateTrend(metrics.map(m => m.sent));
      const deliveryTrend = this.calculateTrend(metrics.map(m => m.deliveryRate));
      const engagementTrend = this.calculateTrend(metrics.map(m => m.openRate + m.clickRate));

      return {
        period,
        metrics,
        trends: {
          sentTrend,
          deliveryTrend,
          engagementTrend,
        },
      };
    } catch (error) {
      logger.error('Failed to get trend analysis', {
        period,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get email health score
   */
  async getHealthScore(filters: EmailAnalyticsFilters = {}): Promise<EmailHealthScore> {
    try {
      const deliveryMetrics = await this.getDeliveryMetrics(filters);
      const templatePerformance = await this.getTemplatePerformance(filters);
      const providerPerformance = await this.getProviderPerformance(filters);

      // Calculate component scores (0-100)
      const deliveryHealth = Math.min(100, deliveryMetrics.deliveryRate);
      const engagementHealth = Math.min(100, (deliveryMetrics.openRate + deliveryMetrics.clickRate) / 2);
      const reputationHealth = Math.max(0, 100 - (deliveryMetrics.bounceRate + deliveryMetrics.failureRate));

      // Calculate overall score
      const overallScore = (deliveryHealth * 0.4 + engagementHealth * 0.3 + reputationHealth * 0.3);

      // Generate recommendations and critical issues
      const recommendations: string[] = [];
      const criticalIssues: string[] = [];

      if (deliveryMetrics.deliveryRate < 95) {
        recommendations.push('Improve delivery rate by cleaning email lists and using authenticated domains');
      }
      if (deliveryMetrics.openRate < 20) {
        recommendations.push('Improve subject lines and send timing to increase open rates');
      }
      if (deliveryMetrics.clickRate < 2) {
        recommendations.push('Optimize email content and call-to-action buttons to improve click rates');
      }
      if (deliveryMetrics.bounceRate > 5) {
        criticalIssues.push('High bounce rate detected - immediate list cleaning required');
      }
      if (deliveryMetrics.failureRate > 10) {
        criticalIssues.push('High failure rate detected - check email service configuration');
      }

      // Template-specific recommendations
      const poorPerformingTemplates = templatePerformance.filter(t => t.openRate < 15);
      if (poorPerformingTemplates.length > 0) {
        recommendations.push(`Review and optimize these templates: ${poorPerformingTemplates.map(t => t.templateType).join(', ')}`);
      }

      // Provider-specific recommendations
      const poorPerformingProviders = providerPerformance.filter(p => p.deliveryRate < 90);
      if (poorPerformingProviders.length > 0) {
        recommendations.push(`Consider switching from these providers: ${poorPerformingProviders.map(p => p.provider).join(', ')}`);
      }

      return {
        overallScore: Math.round(overallScore),
        deliveryHealth: Math.round(deliveryHealth),
        engagementHealth: Math.round(engagementHealth),
        reputationHealth: Math.round(reputationHealth),
        recommendations,
        criticalIssues,
      };
    } catch (error) {
      logger.error('Failed to get health score', {
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Build Sequelize where clause from filters
   */
  private buildWhereClause(filters: EmailAnalyticsFilters): any {
    const where: any = {};

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt[Op.gte] = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt[Op.lte] = filters.dateTo;
      }
    }

    if (filters.templateType) {
      where.templateType = filters.templateType;
    }

    if (filters.provider) {
      where.provider = filters.provider;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.campaignId) {
      where.campaignId = filters.campaignId;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    return where;
  }

  /**
   * Build SQL where clause string for raw queries
   */
  private buildSqlWhereClause(whereClause: any): string {
    const conditions: string[] = ['1=1']; // Base condition

    if (whereClause.createdAt) {
      if (whereClause.createdAt[Op.gte]) {
        conditions.push(`created_at >= '${whereClause.createdAt[Op.gte].toISOString()}'`);
      }
      if (whereClause.createdAt[Op.lte]) {
        conditions.push(`created_at <= '${whereClause.createdAt[Op.lte].toISOString()}'`);
      }
    }

    if (whereClause.templateType) {
      conditions.push(`template_type = '${whereClause.templateType}'`);
    }

    if (whereClause.provider) {
      conditions.push(`provider = '${whereClause.provider}'`);
    }

    if (whereClause.status) {
      conditions.push(`status = '${whereClause.status}'`);
    }

    if (whereClause.campaignId) {
      conditions.push(`campaign_id = '${whereClause.campaignId}'`);
    }

    if (whereClause.entityType) {
      conditions.push(`entity_type = '${whereClause.entityType}'`);
    }

    if (whereClause.entityId) {
      conditions.push(`entity_id = ${whereClause.entityId}`);
    }

    if (whereClause.userId) {
      conditions.push(`user_id = ${whereClause.userId}`);
    }

    return conditions.join(' AND ');
  }

  /**
   * Calculate trend direction from array of values
   */
  private calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (changePercent > 5) return 'improving';
    if (changePercent < -5) return 'declining';
    return 'stable';
  }
}

// Export singleton instance
export const emailAnalyticsService = EmailAnalyticsService.getInstance();