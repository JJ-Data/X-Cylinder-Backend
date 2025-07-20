import { Request, Response } from 'express';
import { settingsService } from '@services/settings.service';
import { pricingService } from '@services/pricing.service';
import { 
  BusinessSettingCreationAttributes, 
  SettingsQueryParams,
  SettingsScope 
} from '@app-types/settings.types';
import { DataType, OperationType } from '@models/BusinessSetting.model';
import { handleAsync } from '@utils/asyncHandler';
import { AppError } from '@utils/errors';

export class SettingsController {
  /**
   * Get all settings with filtering and pagination
   */
  getAllSettings = handleAsync(async (req: Request, res: Response) => {
    const params: SettingsQueryParams = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      category: req.query.category as string,
      search: req.query.search as string,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      effectiveOnly: req.query.effectiveOnly !== 'false',
    };

    const result = await settingsService.getAllSettings(params);

    res.json({
      success: true,
      data: result.settings,
      pagination: result.pagination,
    });
  });

  /**
   * Get a specific setting by key with scope
   */
  getSetting = handleAsync(async (req: Request, res: Response) => {
    const { key } = req.params;
    const scope: SettingsScope = {
      outletId: req.query.outletId ? parseInt(req.query.outletId as string) : undefined,
      cylinderType: req.query.cylinderType as string,
      customerTier: req.query.customerTier as 'regular' | 'business' | 'premium',
      operationType: req.query.operationType as OperationType,
    };

    if (!key) {
      throw new AppError('Setting key is required', 400);
    }

    const value = await settingsService.getSetting(key, scope);

    if (value === null) {
      throw new AppError('Setting not found', 404);
    }

    res.json({
      success: true,
      data: {
        key,
        value,
        scope,
      },
    });
  });

  /**
   * Get all setting categories
   */
  getCategories = handleAsync(async (req: Request, res: Response) => {
    const categories = await settingsService.getCategories();

    res.json({
      success: true,
      data: categories,
    });
  });

  /**
   * Get settings statistics for dashboard
   */
  getStatistics = handleAsync(async (req: Request, res: Response) => {
    const filters = {
      period: req.query.period as string,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
      outletId: req.query.outletId ? parseInt(req.query.outletId as string) : undefined,
    };

    const statistics = await settingsService.getStatistics(filters);

    res.json({
      success: true,
      data: statistics,
    });
  });

  /**
   * Get settings by category
   */
  getSettingsByCategory = handleAsync(async (req: Request, res: Response) => {
    const { category } = req.params;
    
    if (!category) {
      throw new AppError('Category is required', 400);
    }
    const scope: SettingsScope = {
      outletId: req.query.outletId ? parseInt(req.query.outletId as string) : undefined,
      cylinderType: req.query.cylinderType as string,
      customerTier: req.query.customerTier as 'regular' | 'business' | 'premium',
      operationType: req.query.operationType as OperationType,
    };

    const settings = await settingsService.getSettingsByCategory(category, scope);

    res.json({
      success: true,
      data: {
        category,
        settings,
        scope,
      },
    });
  });

  /**
   * Create or update a setting (Admin only)
   */
  createOrUpdateSetting = handleAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const {
      key,
      value,
      categoryId,
      dataType = DataType.STRING,
      scope = {},
      priority = 0,
      effectiveDate,
      expiryDate,
      reason,
    } = req.body;

    // Validate required fields
    if (!key || value === undefined || !categoryId) {
      throw new AppError('Key, value, and categoryId are required', 400);
    }

    // Validate data type
    if (!Object.values(DataType).includes(dataType)) {
      throw new AppError('Invalid data type', 400);
    }

    const setting = await settingsService.setSetting(key, value, {
      categoryId,
      dataType,
      scope,
      priority,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      createdBy: userId,
      reason,
    });

    res.status(201).json({
      success: true,
      data: setting,
      message: 'Setting created/updated successfully',
    });
  });

  /**
   * Delete a setting (Admin only)
   */
  deleteSetting = handleAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!id || isNaN(parseInt(id))) {
      throw new AppError('Valid setting ID is required', 400);
    }

    await settingsService.deleteSetting(parseInt(id), userId, reason);

    res.json({
      success: true,
      message: 'Setting deleted successfully',
    });
  });

  /**
   * Calculate price for an operation
   */
  calculatePrice = handleAsync(async (req: Request, res: Response) => {
    const {
      operationType,
      cylinderType,
      cylinderSize,
      quantity = 1,
      customerTier,
      outletId,
      customerId,
      duration,
      gasAmount,
    } = req.body;

    // Validate required fields
    if (!operationType || !Object.values(OperationType).includes(operationType)) {
      throw new AppError('Valid operation type is required', 400);
    }

    if (quantity <= 0) {
      throw new AppError('Quantity must be greater than 0', 400);
    }

    const pricingResult = await pricingService.calculatePrice({
      operationType,
      cylinderType,
      cylinderSize,
      quantity,
      customerTier,
      outletId,
      customerId,
      duration,
      gasAmount,
    });

    res.json({
      success: true,
      data: pricingResult,
    });
  });

  /**
   * Calculate bulk pricing
   */
  calculateBulkPrice = handleAsync(async (req: Request, res: Response) => {
    const {
      operationType,
      items,
      customerTier,
      outletId,
      customerId,
      duration,
    } = req.body;

    // Validate required fields
    if (!operationType || !Object.values(OperationType).includes(operationType)) {
      throw new AppError('Valid operation type is required', 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('Items array is required and cannot be empty', 400);
    }

    // Validate each item
    for (const item of items) {
      if (!item.cylinderType || item.quantity <= 0) {
        throw new AppError('Each item must have cylinderType and quantity > 0', 400);
      }
    }

    const bulkPricingResult = await pricingService.calculateBulkPrice({
      operationType,
      items,
      customerTier,
      outletId,
      customerId,
      duration,
    });

    res.json({
      success: true,
      data: bulkPricingResult,
    });
  });

  /**
   * Get price quote without applying charges
   */
  getQuote = handleAsync(async (req: Request, res: Response) => {
    const {
      operationType,
      cylinderType,
      cylinderSize,
      quantity = 1,
      customerTier,
      outletId,
      customerId,
      duration,
      gasAmount,
    } = req.query;

    // Validate required fields
    if (!operationType || !Object.values(OperationType).includes(operationType as OperationType)) {
      throw new AppError('Valid operation type is required', 400);
    }

    const quote = await pricingService.getQuote({
      operationType: operationType as OperationType,
      cylinderType: cylinderType as string,
      cylinderSize: cylinderSize as string,
      quantity: parseInt(quantity as string) || 1,
      customerTier: customerTier as 'regular' | 'business' | 'premium',
      outletId: outletId ? parseInt(outletId as string) : undefined,
      customerId: customerId ? parseInt(customerId as string) : undefined,
      duration: duration ? parseInt(duration as string) : undefined,
      gasAmount: gasAmount ? parseFloat(gasAmount as string) : undefined,
    });

    res.json({
      success: true,
      data: quote,
    });
  });

  /**
   * Validate pricing configuration
   */
  validatePricingConfig = handleAsync(async (req: Request, res: Response) => {
    const { operationType } = req.params;
    const scope: SettingsScope = {
      outletId: req.query.outletId ? parseInt(req.query.outletId as string) : undefined,
      cylinderType: req.query.cylinderType as string,
      customerTier: req.query.customerTier as 'regular' | 'business' | 'premium',
      operationType: req.query.operationType as OperationType,
    };

    if (!Object.values(OperationType).includes(operationType as OperationType)) {
      throw new AppError('Valid operation type is required', 400);
    }

    const validation = await pricingService.validatePricingConfig(
      operationType as OperationType,
      scope
    );

    res.json({
      success: true,
      data: validation,
    });
  });

  /**
   * Get revenue projection based on current pricing
   */
  getRevenueProjection = handleAsync(async (req: Request, res: Response) => {
    const { operationType } = req.params;
    const { estimatedVolume } = req.query;

    const scope: SettingsScope = {
      outletId: req.query.outletId ? parseInt(req.query.outletId as string) : undefined,
      cylinderType: req.query.cylinderType as string,
      customerTier: req.query.customerTier as 'regular' | 'business' | 'premium',
      operationType: req.query.operationType as OperationType,
    };

    if (!Object.values(OperationType).includes(operationType as OperationType)) {
      throw new AppError('Valid operation type is required', 400);
    }

    if (!estimatedVolume || isNaN(parseInt(estimatedVolume as string))) {
      throw new AppError('Valid estimated volume is required', 400);
    }

    const projection = await pricingService.calculateRevenueProjection(
      operationType as OperationType,
      scope,
      parseInt(estimatedVolume as string)
    );

    res.json({
      success: true,
      data: projection,
    });
  });

  /**
   * Get competitive pricing analysis
   */
  getCompetitivePricing = handleAsync(async (req: Request, res: Response) => {
    const { operationType } = req.params;
    const scope: SettingsScope = {
      outletId: req.query.outletId ? parseInt(req.query.outletId as string) : undefined,
      cylinderType: req.query.cylinderType as string,
      customerTier: req.query.customerTier as 'regular' | 'business' | 'premium',
      operationType: req.query.operationType as OperationType,
    };

    if (!Object.values(OperationType).includes(operationType as OperationType)) {
      throw new AppError('Valid operation type is required', 400);
    }

    const analysis = await pricingService.getCompetitivePricing(
      operationType as OperationType,
      scope
    );

    res.json({
      success: true,
      data: analysis,
    });
  });

  /**
   * Export settings configuration
   */
  exportSettings = handleAsync(async (req: Request, res: Response) => {
    const { category, format = 'json' } = req.query;
    
    if (category && typeof category !== 'string') {
      throw new AppError('Category must be a string', 400);
    }

    const params: SettingsQueryParams = {
      page: 1,
      limit: 1000, // Export all
      category: category as string,
      effectiveOnly: false,
    };

    const result = await settingsService.getAllSettings(params);

    if (format === 'csv') {
      // Convert to CSV format
      const csv = this.convertToCSV(result.settings);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=settings.csv');
      res.send(csv);
    } else {
      // Default JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=settings.json');
      res.json({
        exportDate: new Date().toISOString(),
        totalSettings: result.settings.length,
        settings: result.settings,
      });
    }
  });

  /**
   * Import settings configuration (Admin only)
   */
  importSettings = handleAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { settings, overwriteExisting = false } = req.body;

    if (!Array.isArray(settings)) {
      throw new AppError('Settings array is required', 400);
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const setting of settings) {
      try {
        await settingsService.setSetting(setting.settingKey, setting.settingValue, {
          categoryId: setting.categoryId,
          dataType: setting.dataType,
          scope: {
            outletId: setting.outletId,
            cylinderType: setting.cylinderType,
            customerTier: setting.customerTier,
            operationType: setting.operationType,
          },
          priority: setting.priority,
          effectiveDate: setting.effectiveDate ? new Date(setting.effectiveDate) : undefined,
          expiryDate: setting.expiryDate ? new Date(setting.expiryDate) : undefined,
          createdBy: userId,
          reason: 'Bulk import',
        });

        results.created++;
      } catch (error) {
        results.errors.push(`Failed to import setting ${setting.settingKey}: ${(error as Error).message}`);
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Import completed: ${results.created} settings processed`,
    });
  });

  /**
   * Private helper methods
   */
  private convertToCSV(settings: any[]): string {
    if (settings.length === 0) return '';

    const headers = Object.keys(settings[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = settings.map(setting => 
      headers.map(header => {
        const value = setting[header];
        // Handle JSON values and escape commas
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }
}

export const settingsController = new SettingsController();