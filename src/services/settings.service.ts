import { Op } from 'sequelize';
import { BusinessSetting } from '@models/BusinessSetting.model';
import { SettingCategory } from '@models/SettingCategory.model';
import { PricingRule, RuleType } from '@models/PricingRule.model';
import { SettingsAudit, AuditAction } from '@models/SettingsAudit.model';
import { 
  BusinessSettingAttributes, 
  BusinessSettingCreationAttributes,
  SettingsQueryParams,
  SettingsScope,
  SETTING_KEYS 
} from '@app-types/settings.types';
import { DataType, CustomerTier, OperationType } from '@models/BusinessSetting.model';

export class SettingsService {
  /**
   * Get a setting value with hierarchical fallback
   * Hierarchy: Specific scope → Outlet → Global
   */
  async getSetting(
    key: string, 
    scope: SettingsScope = {}
  ): Promise<any> {
    const settings = await BusinessSetting.scope('effective').findAll({
      where: {
        settingKey: key,
      },
      order: [['priority', 'DESC'], ['createdAt', 'ASC']],
    });

    // Filter settings that match the scope and find the most specific one
    const matchingSettings = settings.filter(setting => this.matchesScope(setting, scope));
    
    if (matchingSettings.length === 0) {
      return null;
    }

    // Sort by specificity (most specific first)
    const sortedSettings = this.sortBySpecificity(matchingSettings, scope);
    const bestMatch = sortedSettings[0];
    
    return this.getTypedValue(bestMatch);
  }

  /**
   * Get multiple settings at once with hierarchical resolution
   */
  async getSettings(
    keys: string[], 
    scope: SettingsScope = {}
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    for (const key of keys) {
      results[key] = await this.getSetting(key, scope);
    }
    
    return results;
  }

  /**
   * Get all settings for a category with scope filtering
   */
  async getSettingsByCategory(
    categoryName: string, 
    scope: SettingsScope = {}
  ): Promise<Record<string, any>> {
    const category = await SettingCategory.findOne({
      where: { name: categoryName.toUpperCase(), isActive: true }
    });

    if (!category) {
      throw new Error(`Category '${categoryName}' not found`);
    }

    const settings = await BusinessSetting.scope('effective').findAll({
      where: { categoryId: category.id },
      order: [['priority', 'DESC'], ['settingKey', 'ASC']],
    });

    const results: Record<string, any> = {};
    
    // Group settings by key and resolve hierarchy
    const settingsByKey = new Map<string, any[]>();
    
    for (const setting of settings) {
      if (this.matchesScope(setting, scope)) {
        if (!settingsByKey.has(setting.settingKey)) {
          settingsByKey.set(setting.settingKey, []);
        }
        settingsByKey.get(setting.settingKey)!.push(setting);
      }
    }

    // Resolve each setting key to its best value
    for (const [key, settingsList] of settingsByKey) {
      const sortedSettings = this.sortBySpecificity(settingsList, scope);
      if (sortedSettings.length > 0) {
        results[key] = this.getTypedValue(sortedSettings[0]);
      }
    }

    return results;
  }

  /**
   * Create or update a setting
   */
  async setSetting(
    key: string,
    value: any,
    options: {
      categoryId: number;
      dataType: DataType;
      scope?: SettingsScope;
      priority?: number;
      effectiveDate?: Date;
      expiryDate?: Date;
      createdBy: number;
      reason?: string;
    }
  ): Promise<BusinessSettingAttributes> {
    const { categoryId, dataType, scope = {}, priority = 0, effectiveDate, expiryDate, createdBy, reason } = options;

    // Check if setting already exists with same scope
    const whereClause: any = {
      settingKey: key,
    };
    
    if (scope.outletId) {
      whereClause.outletId = scope.outletId;
    } else {
      whereClause.outletId = null;
    }
    
    if (scope.cylinderType) {
      whereClause.cylinderType = scope.cylinderType;
    } else {
      whereClause.cylinderType = null;
    }
    
    if (scope.customerTier) {
      whereClause.customerTier = scope.customerTier;
    } else {
      whereClause.customerTier = null;
    }
    
    if (scope.operationType) {
      whereClause.operationType = scope.operationType;
    } else {
      whereClause.operationType = null;
    }

    const existingSetting = await BusinessSetting.findOne({
      where: whereClause
    });

    let setting: any;
    let auditAction: AuditAction;
    let oldValue = null;

    if (existingSetting) {
      oldValue = existingSetting.settingValue;
      await existingSetting.update({
        settingValue: value,
        dataType,
        priority,
        effectiveDate: effectiveDate || existingSetting.effectiveDate,
        expiryDate,
        updatedBy: createdBy,
      });
      setting = existingSetting;
      auditAction = AuditAction.UPDATED;
    } else {
      const createData: BusinessSettingCreationAttributes = {
        categoryId,
        settingKey: key,
        settingValue: value,
        dataType,
        outletId: scope.outletId,
        cylinderType: scope.cylinderType,
        customerTier: scope.customerTier,
        operationType: scope.operationType,
        priority,
        effectiveDate: effectiveDate || new Date(),
        expiryDate,
        isActive: true,
        createdBy,
        updatedBy: createdBy,
        version: 1,
      };

      setting = await BusinessSetting.create(createData);
      auditAction = AuditAction.CREATED;
    }

    // Create audit log
    await this.createAuditLog({
      settingId: setting.id,
      action: auditAction,
      oldValue,
      newValue: value,
      changedBy: createdBy,
      changeReason: reason,
    });

    return setting;
  }

  /**
   * Delete a setting
   */
  async deleteSetting(
    settingId: number, 
    deletedBy: number, 
    reason?: string
  ): Promise<void> {
    const setting = await BusinessSetting.findByPk(settingId);
    
    if (!setting) {
      throw new Error('Setting not found');
    }

    const oldValue = {
      settingKey: setting.settingKey,
      settingValue: setting.settingValue,
      scope: {
        outletId: setting.outletId,
        cylinderType: setting.cylinderType,
        customerTier: setting.customerTier,
        operationType: setting.operationType,
      }
    };

    await setting.destroy();

    // Create audit log
    await this.createAuditLog({
      settingId: setting.id,
      action: AuditAction.DELETED,
      oldValue,
      newValue: null,
      changedBy: deletedBy,
      changeReason: reason,
    });
  }

  /**
   * Get pricing for a specific operation
   */
  async getPrice(
    operationType: OperationType,
    scope: SettingsScope & { quantity?: number; cylinderSize?: string }
  ): Promise<number> {
    const { quantity = 1, cylinderSize, ...baseScope } = scope;
    
    // Get base price from settings
    const priceKey = this.getPriceKeyForOperation(operationType, cylinderSize);
    const basePrice = await this.getSetting(priceKey, baseScope);
    
    if (basePrice === null) {
      throw new Error(`No price configured for ${operationType} operation`);
    }

    // Apply pricing rules
    const finalPrice = await this.applyPricingRules(basePrice, operationType, scope);
    
    return finalPrice * quantity;
  }

  /**
   * Apply pricing rules to a base price
   */
  async applyPricingRules(
    basePrice: number,
    operationType: OperationType,
    scope: SettingsScope & { quantity?: number; cylinderSize?: string }
  ): Promise<number> {
    const currentDate = new Date();
    // Use a simpler where clause to avoid complex Sequelize typing issues
    const rules = await PricingRule.scope('active').findAll({
      order: [['priority', 'DESC']]
    });

    let finalPrice = basePrice;

    for (const rule of rules) {
      if (this.ruleApplies(rule, operationType, scope)) {
        finalPrice = this.applyRuleActions(finalPrice, rule.actions, scope);
      }
    }

    return Math.max(0, finalPrice); // Ensure price is not negative
  }

  /**
   * Calculate bulk pricing with volume discounts
   */
  async calculateBulkPrice(
    operationType: OperationType,
    items: Array<{ cylinderType: string; quantity: number }>,
    scope: Omit<SettingsScope, 'cylinderType'>
  ): Promise<{ totalPrice: number; itemPrices: Array<{ cylinderType: string; quantity: number; unitPrice: number; totalPrice: number }> }> {
    const currentDate = new Date();
    const itemPrices = [];
    let totalPrice = 0;

    for (const item of items) {
      const itemScope = { ...scope, cylinderType: item.cylinderType, quantity: item.quantity };
      const unitPrice = await this.getPrice(operationType, itemScope);
      const itemTotal = unitPrice;
      
      itemPrices.push({
        cylinderType: item.cylinderType,
        quantity: item.quantity,
        unitPrice: unitPrice / item.quantity,
        totalPrice: itemTotal
      });
      
      totalPrice += itemTotal;
    }

    // Apply bulk discount rules
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const bulkScope = { ...scope, quantity: totalQuantity };
    
    const bulkRules = await PricingRule.findAll({
      where: {
        ruleType: RuleType.VOLUME_DISCOUNT,
        isActive: true
      }
    });

    for (const rule of bulkRules) {
      if (this.ruleApplies(rule, operationType, bulkScope)) {
        totalPrice = this.applyRuleActions(totalPrice, rule.actions, bulkScope);
      }
    }

    return { totalPrice: Math.max(0, totalPrice), itemPrices };
  }

  /**
   * Get all setting categories
   */
  async getCategories(): Promise<any[]> {
    const categories = await SettingCategory.scope('active').findAll({
      attributes: ['id', 'name', 'description', 'icon', 'isActive', 'displayOrder', 'createdAt', 'updatedAt'],
      order: [['displayOrder', 'ASC'], ['name', 'ASC']]
    });

    // Get settings count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const settingsCount = await BusinessSetting.count({
          where: { categoryId: category.id, isActive: true }
        });
        
        return {
          ...category.toJSON(),
          settingsCount
        };
      })
    );

    return categoriesWithCount;
  }

  /**
   * Get dashboard statistics
   */
  async getStatistics(filters: {
    period?: string;
    categoryId?: number;
    outletId?: number;
  } = {}): Promise<{
    totalSettings: number;
    activeSettings: number;
    categoriesCount: number;
    recentChanges: number;
    settingsByCategory: Record<string, number>;
    settingsByScope: {
      global: number;
      outlet: number;
      customerTier: number;
      cylinderType: number;
      complex: number;
    };
    priceOverrides: number;
    scheduledChanges: number;
  }> {
    const { period = '7d', categoryId, outletId } = filters;
    
    // Calculate date range for recent changes
    const periodDate = new Date();
    const daysBack = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 7;
    periodDate.setDate(periodDate.getDate() - daysBack);

    // Build base where clause
    const baseWhere: any = {};
    if (categoryId) {
      baseWhere.categoryId = categoryId;
    }
    if (outletId) {
      baseWhere.outletId = outletId;
    }

    // Get basic counts
    const [
      totalSettings,
      activeSettings,
      categoriesCount,
      recentChanges,
      scheduledChanges
    ] = await Promise.all([
      BusinessSetting.count({ where: baseWhere }),
      BusinessSetting.count({ where: { ...baseWhere, isActive: true } }),
      SettingCategory.count({ where: { isActive: true } }),
      BusinessSetting.count({
        where: {
          ...baseWhere,
          updatedAt: { [Op.gte]: periodDate }
        }
      }),
      BusinessSetting.count({
        where: {
          ...baseWhere,
          effectiveDate: { [Op.gt]: new Date() }
        }
      })
    ]);

    // Get settings by category
    const settingsByCategory: Record<string, number> = {};
    const categories = await SettingCategory.findAll({
      attributes: ['id', 'name'],
      where: { isActive: true }
    });

    for (const category of categories) {
      const count = await BusinessSetting.count({
        where: {
          ...baseWhere,
          categoryId: category.id,
          isActive: true
        }
      });
      settingsByCategory[category.name] = count;
    }

    // Get settings by scope
    const [
      globalSettings,
      outletSettings,
      customerTierSettings,
      cylinderTypeSettings
    ] = await Promise.all([
      BusinessSetting.count({
        where: {
          ...baseWhere,
          isActive: true,
          outletId: null,
          customerTier: null,
          cylinderType: null,
          operationType: null
        }
      }),
      BusinessSetting.count({
        where: {
          ...baseWhere,
          isActive: true,
          outletId: { [Op.not]: null },
          customerTier: null,
          cylinderType: null,
          operationType: null
        }
      }),
      BusinessSetting.count({
        where: {
          ...baseWhere,
          isActive: true,
          customerTier: { [Op.not]: null }
        }
      }),
      BusinessSetting.count({
        where: {
          ...baseWhere,
          isActive: true,
          cylinderType: { [Op.not]: null }
        }
      })
    ]);

    // Complex scope = settings with multiple scope criteria
    const complexSettings = await BusinessSetting.count({
      where: {
        ...baseWhere,
        isActive: true,
        [Op.or]: [
          {
            [Op.and]: [
              { outletId: { [Op.not]: null } },
              { [Op.or]: [
                { customerTier: { [Op.not]: null } },
                { cylinderType: { [Op.not]: null } },
                { operationType: { [Op.not]: null } }
              ]}
            ]
          }
        ]
      }
    });

    // Count price override settings (settings ending with _PRICE, _FEE, etc.)
    const priceOverrides = await BusinessSetting.count({
      where: {
        ...baseWhere,
        isActive: true,
        settingKey: {
          [Op.or]: [
            { [Op.like]: '%_PRICE%' },
            { [Op.like]: '%_FEE%' },
            { [Op.like]: '%_RATE%' },
            { [Op.like]: '%_AMOUNT%' }
          ]
        }
      }
    });

    return {
      totalSettings,
      activeSettings,
      categoriesCount,
      recentChanges,
      settingsByCategory,
      settingsByScope: {
        global: globalSettings,
        outlet: outletSettings,
        customerTier: customerTierSettings,
        cylinderType: cylinderTypeSettings,
        complex: complexSettings
      },
      priceOverrides,
      scheduledChanges
    };
  }

  /**
   * Get all available settings with pagination and filtering
   */
  async getAllSettings(params: SettingsQueryParams = {}): Promise<{
    settings: BusinessSettingAttributes[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const {
      page = 1,
      limit = 50,
      category,
      scope,
      search,
      isActive,
      effectiveOnly = true
    } = params;

    const offset = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.settingKey = { [Op.like]: `%${search}%` };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (effectiveOnly) {
      const currentDate = new Date();
      where.effectiveDate = { [Op.lte]: currentDate };
      // Simplified condition for expiry date to avoid complex typing
      where.isActive = true;
    }

    const include = [];
    if (category) {
      include.push({
        model: SettingCategory,
        where: { name: category.toUpperCase() },
        required: true
      });
    }

    const { count, rows } = await BusinessSetting.findAndCountAll({
      where,
      include,
      offset,
      limit,
      order: [['priority', 'DESC'], ['settingKey', 'ASC']]
    });

    return {
      settings: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Helper methods
   */
  private getTypedValue(setting: any): any {
    switch (setting.dataType) {
      case DataType.NUMBER:
        return typeof setting.settingValue === 'number' ? setting.settingValue : parseFloat(setting.settingValue);
      case DataType.BOOLEAN:
        return typeof setting.settingValue === 'boolean' ? setting.settingValue : Boolean(setting.settingValue);
      case DataType.JSON:
      case DataType.ARRAY:
        return typeof setting.settingValue === 'object' ? setting.settingValue : JSON.parse(setting.settingValue);
      case DataType.STRING:
      default:
        return String(setting.settingValue);
    }
  }

  private matchesScope(setting: any, scope: SettingsScope): boolean {
    // Check outlet match (null outlet means global setting)
    if (setting.outletId && scope.outletId && setting.outletId !== scope.outletId) {
      return false;
    }

    // Check cylinder type match
    if (setting.cylinderType && scope.cylinderType && setting.cylinderType !== scope.cylinderType) {
      return false;
    }

    // Check customer tier match
    if (setting.customerTier && scope.customerTier && setting.customerTier !== scope.customerTier) {
      return false;
    }

    // Check operation type match
    if (setting.operationType && scope.operationType && setting.operationType !== scope.operationType) {
      return false;
    }

    return true;
  }

  /**
   * Private helper methods
   */
  private sortBySpecificity(settings: any[], scope: SettingsScope): any[] {
    return settings.sort((a, b) => {
      const aSpecificity = this.calculateSpecificity(a, scope);
      const bSpecificity = this.calculateSpecificity(b, scope);
      
      if (aSpecificity !== bSpecificity) {
        return bSpecificity - aSpecificity; // Higher specificity first
      }
      
      // If same specificity, sort by priority then creation date
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  private calculateSpecificity(setting: any, scope: SettingsScope): number {
    let specificity = 0;
    
    // More specific settings get higher scores
    if (setting.operationType && scope.operationType) specificity += 8;
    if (setting.customerTier && scope.customerTier) specificity += 4;
    if (setting.cylinderType && scope.cylinderType) specificity += 2;
    if (setting.outletId && scope.outletId) specificity += 1;
    
    return specificity;
  }

  private getPriceKeyForOperation(operationType: OperationType, cylinderSize?: string): string {
    const baseKeys: Record<OperationType, string> = {
      [OperationType.LEASE]: SETTING_KEYS.LEASE_BASE_PRICE,
      [OperationType.REFILL]: SETTING_KEYS.REFILL_PRICE_PER_KG,
      [OperationType.SWAP]: SETTING_KEYS.SWAP_FEE,
      [OperationType.REGISTRATION]: SETTING_KEYS.REGISTRATION_FEE,
      [OperationType.PENALTY]: SETTING_KEYS.PENALTY_RATE,
      [OperationType.DEPOSIT]: SETTING_KEYS.DEPOSIT_AMOUNT,
    };

    let key = baseKeys[operationType];
    
    if (cylinderSize) {
      return `${key}.${cylinderSize.toLowerCase()}`;
    }
    
    return key;
  }

  private ruleApplies(rule: any, operationType: OperationType, scope: any): boolean {
    const { appliesTo, conditions, outletIds } = rule;
    
    // Check if rule applies to this operation type
    if (appliesTo.operationTypes && !appliesTo.operationTypes.includes(operationType)) {
      return false;
    }
    
    // Check outlet restriction
    if (outletIds && scope.outletId && !outletIds.includes(scope.outletId)) {
      return false;
    }
    
    // Evaluate conditions
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, scope)) {
        return false;
      }
    }
    
    return true;
  }

  private evaluateCondition(condition: any, scope: any): boolean {
    const { field, operator, value } = condition;
    const scopeValue = scope[field];
    
    switch (operator) {
      case 'eq': return scopeValue === value;
      case 'ne': return scopeValue !== value;
      case 'gt': return scopeValue > value;
      case 'gte': return scopeValue >= value;
      case 'lt': return scopeValue < value;
      case 'lte': return scopeValue <= value;
      case 'in': return Array.isArray(value) && value.includes(scopeValue);
      case 'not_in': return Array.isArray(value) && !value.includes(scopeValue);
      default: return true;
    }
  }

  private applyRuleActions(currentPrice: number, actions: any, scope: any): number {
    let newPrice = currentPrice;
    
    for (const action of actions) {
      const { type, value } = action;
      
      switch (type) {
        case 'add':
          newPrice += value;
          break;
        case 'subtract':
          newPrice -= value;
          break;
        case 'multiply':
          newPrice *= value;
          break;
        case 'divide':
          newPrice /= value;
          break;
        case 'percentage_discount':
          newPrice *= (1 - value / 100);
          break;
        case 'percentage_markup':
          newPrice *= (1 + value / 100);
          break;
        case 'set_fixed':
          newPrice = value;
          break;
      }
    }
    
    return newPrice;
  }

  private async createAuditLog(data: {
    settingId?: number;
    ruleId?: number;
    action: AuditAction;
    oldValue: any;
    newValue: any;
    changedBy: number;
    changeReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await SettingsAudit.create(data);
  }
}

export const settingsService = new SettingsService();