import { Op } from 'sequelize';
import { SettingCategory } from '@models/SettingCategory.model';
import { BusinessSetting, DataType, OperationType } from '@models/BusinessSetting.model';

interface SettingScope {
  outletId?: number;
  operationType?: OperationType;
}

export class SimplifiedSettingsService {
  /**
   * Get a setting value by key
   * Uses simple key-based lookup with optional outlet override
   */
  async getSetting(key: string, outletId?: number): Promise<any> {
    // First try to find outlet-specific setting
    if (outletId) {
      const outletSetting = await BusinessSetting.findOne({
        where: {
          settingKey: key,
          outletId,
          isActive: true,
        },
      });
      
      if (outletSetting) {
        return this.getTypedValue(outletSetting);
      }
    }
    
    // Fall back to global setting
    const globalWhere: any = {
      settingKey: key,
      isActive: true,
    };
    // Check for null outletId
    globalWhere.outletId = { [Op.is]: null };
    
    const globalSetting = await BusinessSetting.findOne({
      where: globalWhere,
    });
    
    return globalSetting ? this.getTypedValue(globalSetting) : null;
  }

  /**
   * Set or update a setting
   */
  async setSetting(
    key: string,
    value: any,
    options: {
      categoryId: number;
      dataType: DataType;
      outletId?: number;
      operationType?: OperationType;
      createdBy: number;
    }
  ): Promise<any> {
    const { categoryId, dataType, outletId, operationType, createdBy } = options;

    // Check if setting exists
    const whereClause: any = {
      settingKey: key,
      outletId: outletId || { [Op.is]: null },
    };

    const existingSetting = await BusinessSetting.findOne({ where: whereClause });

    if (existingSetting) {
      // Update existing setting
      await existingSetting.update({
        settingValue: value,
        dataType,
        operationType,
        updatedBy: createdBy,
      });
      return existingSetting;
    } else {
      // Create new setting
      return await BusinessSetting.create({
        categoryId,
        settingKey: key,
        settingValue: value,
        dataType,
        outletId,
        operationType,
        isActive: true,
        createdBy,
        updatedBy: createdBy,
      });
    }
  }

  /**
   * Delete a setting
   */
  async deleteSetting(settingId: number): Promise<void> {
    await BusinessSetting.destroy({ where: { id: settingId } });
  }

  /**
   * Get all settings with optional filters
   */
  async getAllSettings(filters?: {
    categoryId?: number;
    outletId?: number;
    operationType?: OperationType;
    isActive?: boolean;
  }): Promise<any[]> {
    const where: any = {};
    
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.outletId !== undefined) {
      where.outletId = filters.outletId === null ? { [Op.is]: null } : filters.outletId;
    }
    if (filters?.operationType) where.operationType = filters.operationType;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    
    const settings = await BusinessSetting.findAll({
      where,
      include: [
        {
          model: SettingCategory,
          as: 'category',
          attributes: ['id', 'name', 'description'],
        },
      ],
      order: [['settingKey', 'ASC']],
    });
    
    return settings.map(s => ({
      ...s.toJSON(),
      value: this.getTypedValue(s),
    }));
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(categoryName: string, outletId?: number): Promise<Record<string, any>> {
    const category = await SettingCategory.findOne({
      where: { name: categoryName.toUpperCase(), isActive: true },
    });

    if (!category) {
      throw new Error(`Category '${categoryName}' not found`);
    }

    const where: any = { categoryId: category.id, isActive: true };
    if (outletId !== undefined) {
      where.outletId = outletId === null ? { [Op.is]: null } : outletId;
    }

    const settings = await BusinessSetting.findAll({ where });
    
    const result: Record<string, any> = {};
    for (const setting of settings) {
      result[setting.settingKey] = this.getTypedValue(setting);
    }
    
    return result;
  }

  /**
   * Get essential pricing settings for operations
   */
  async getPricingSettings(operationType: OperationType, cylinderType?: string, outletId?: number): Promise<{
    basePrice: number;
    deposit?: number;
    additionalFees?: number;
  }> {
    const settings: any = {};
    
    switch (operationType) {
      case OperationType.LEASE:
        const leaseKey = cylinderType ? `lease.base_price.${cylinderType}` : 'lease.base_price';
        const depositKey = cylinderType ? `lease.deposit.${cylinderType}` : 'lease.deposit';
        
        settings.basePrice = await this.getSetting(leaseKey, outletId) || 0;
        settings.deposit = await this.getSetting(depositKey, outletId) || 0;
        break;
        
      case OperationType.REFILL:
        settings.basePrice = await this.getSetting('refill.price_per_kg', outletId) || 0;
        settings.minimumCharge = await this.getSetting('refill.minimum_charge', outletId) || 0;
        break;
        
      case OperationType.SWAP:
        settings.basePrice = await this.getSetting('swap.fee.standard', outletId) || 0;
        settings.damagedFee = await this.getSetting('swap.fee.damaged', outletId) || 0;
        break;
        
      default:
        settings.basePrice = 0;
    }
    
    // Get tax rate if applicable
    const taxRate = await this.getSetting('tax.rate', outletId) || 0;
    if (taxRate > 0) {
      settings.taxRate = taxRate;
    }
    
    return settings;
  }

  /**
   * Batch update settings
   */
  async batchUpdateSettings(
    updates: Array<{
      key: string;
      value: any;
      dataType: DataType;
      categoryId: number;
      outletId?: number;
    }>,
    updatedBy: number
  ): Promise<void> {
    for (const update of updates) {
      await this.setSetting(update.key, update.value, {
        categoryId: update.categoryId,
        dataType: update.dataType,
        outletId: update.outletId,
        createdBy: updatedBy,
      });
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<any[]> {
    return await SettingCategory.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'description', 'isActive'],
      order: [['name', 'ASC']],
    });
  }

  /**
   * Initialize default settings
   */
  async initializeDefaultSettings(createdBy: number = 1): Promise<void> {
    const defaultSettings = [
      // Lease settings
      { categoryId: 1, key: 'lease.base_price.12kg', value: 50, dataType: DataType.NUMBER },
      { categoryId: 1, key: 'lease.base_price.25kg', value: 75, dataType: DataType.NUMBER },
      { categoryId: 1, key: 'lease.base_price.50kg', value: 100, dataType: DataType.NUMBER },
      { categoryId: 1, key: 'lease.deposit.12kg', value: 500, dataType: DataType.NUMBER },
      { categoryId: 1, key: 'lease.deposit.25kg', value: 750, dataType: DataType.NUMBER },
      { categoryId: 1, key: 'lease.deposit.50kg', value: 1000, dataType: DataType.NUMBER },
      
      // Refill settings
      { categoryId: 2, key: 'refill.price_per_kg', value: 10, dataType: DataType.NUMBER },
      { categoryId: 2, key: 'refill.minimum_charge', value: 50, dataType: DataType.NUMBER },
      
      // Swap settings
      { categoryId: 3, key: 'swap.fee.standard', value: 0, dataType: DataType.NUMBER },
      { categoryId: 3, key: 'swap.fee.damaged', value: 200, dataType: DataType.NUMBER },
      
      // General settings
      { categoryId: 4, key: 'tax.rate', value: 7.5, dataType: DataType.NUMBER },
      { categoryId: 4, key: 'late.fee.daily', value: 10, dataType: DataType.NUMBER },
    ];
    
    for (const setting of defaultSettings) {
      // Check if setting exists
      const exists = await BusinessSetting.findOne({
        where: { settingKey: setting.key },
      });
      
      if (!exists) {
        await this.setSetting(setting.key, setting.value, {
          categoryId: setting.categoryId,
          dataType: setting.dataType,
          createdBy,
        });
      }
    }
  }

  /**
   * Private helper to get typed value
   */
  private getTypedValue(setting: any): any {
    const value = setting.settingValue;
    const dataType = setting.dataType;
    
    if (value === null || value === undefined) return null;
    
    switch (dataType) {
      case DataType.NUMBER:
        return typeof value === 'number' ? value : Number(value);
      case DataType.BOOLEAN:
        return typeof value === 'boolean' ? value : value === 'true';
      default:
        return String(value);
    }
  }
}

export const simplifiedSettingsService = new SimplifiedSettingsService();