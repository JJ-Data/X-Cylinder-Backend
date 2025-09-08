import { settingsService } from './settings.service';
import { OperationType } from '@models/BusinessSetting.model';
import { SettingsScope } from '@app-types/settings.types';

export interface PricingRequest {
  operationType: OperationType;
  cylinderType?: string;
  cylinderSize?: string;
  quantity: number;
  customerTier?: 'regular' | 'business' | 'premium';
  outletId?: number;
  customerId?: number;
  duration?: number; // For lease operations (in days)
  gasAmount?: number; // For refill operations (in kg)
}

export interface PricingResult {
  basePrice: number;
  totalPrice: number;
  appliedRules: Array<{
    ruleId: number;
    ruleName: string;
    ruleType: string;
    adjustment: number;
    description: string;
  }>;
  breakdown: {
    unitPrice: number;
    quantity: number;
    subtotal: number;
    discounts: number;
    surcharges: number;
    taxes: number;
  };
  scope: SettingsScope;
}

export interface BulkPricingRequest {
  operationType: OperationType;
  items: Array<{
    cylinderType: string;
    cylinderSize?: string;
    quantity: number;
    gasAmount?: number;
  }>;
  customerTier?: 'regular' | 'business' | 'premium';
  outletId?: number;
  customerId?: number;
  duration?: number;
}

export interface BulkPricingResult {
  totalPrice: number;
  items: Array<PricingResult>;
  bulkDiscounts: Array<{
    ruleId: number;
    ruleName: string;
    totalDiscount: number;
    description: string;
  }>;
  summary: {
    subtotal: number;
    totalDiscounts: number;
    totalSurcharges: number;
    totalTaxes: number;
    finalTotal: number;
  };
}

export class PricingService {
  /**
   * Calculate price for a single operation
   */
  async calculatePrice(request: PricingRequest): Promise<PricingResult> {
    const scope: SettingsScope = {
      outletId: request.outletId,
      cylinderType: request.cylinderType,
      customerTier: request.customerTier,
      operationType: request.operationType,
      quantity: request.quantity,
      cylinderSize: request.cylinderSize,
    };

    // Get base price
    const basePrice = await settingsService.getPrice(request.operationType, scope);
    
    // Calculate total with quantity
    let totalPrice = basePrice;

    // Apply operation-specific calculations
    switch (request.operationType) {
      case OperationType.LEASE:
        if (request.duration) {
          totalPrice = await this.calculateLeasePrice(basePrice, request.duration, scope);
        }
        break;
      
      case OperationType.REFILL:
        if (request.gasAmount) {
          totalPrice = await this.calculateRefillPrice(basePrice, request.gasAmount, scope);
        }
        break;
      
      default:
        totalPrice = basePrice * request.quantity;
        break;
    }

    // Get pricing breakdown
    const breakdown = {
      unitPrice: basePrice,
      quantity: request.quantity,
      subtotal: totalPrice,
      discounts: 0,
      surcharges: 0,
      taxes: 0,
    };

    // Apply taxes if configured
    const taxRate = await settingsService.getSetting('tax.rate', scope) || 0;
    breakdown.taxes = totalPrice * (taxRate / 100);
    totalPrice += breakdown.taxes;

    return {
      basePrice,
      totalPrice: Math.round(totalPrice * 100) / 100, // Round to 2 decimal places
      appliedRules: [], // This would be populated by the pricing rules engine
      breakdown,
      scope,
    };
  }

  /**
   * Calculate prices for multiple items with bulk discounts
   */
  async calculateBulkPrice(request: BulkPricingRequest): Promise<BulkPricingResult> {
    const itemResults: PricingResult[] = [];
    let subtotal = 0;

    // Calculate individual item prices
    for (const item of request.items) {
      const itemRequest: PricingRequest = {
        operationType: request.operationType,
        cylinderType: item.cylinderType,
        cylinderSize: item.cylinderSize,
        quantity: item.quantity,
        customerTier: request.customerTier,
        outletId: request.outletId,
        customerId: request.customerId,
        duration: request.duration,
        gasAmount: item.gasAmount,
      };

      const itemResult = await this.calculatePrice(itemRequest);
      itemResults.push(itemResult);
      subtotal += itemResult.totalPrice;
    }

    // Apply bulk discounts
    const totalQuantity = request.items.reduce((sum, item) => sum + item.quantity, 0);
    const bulkScope: SettingsScope = {
      outletId: request.outletId,
      customerTier: request.customerTier,
      operationType: request.operationType,
      quantity: totalQuantity,
    };

    const bulkDiscountRate = await this.getBulkDiscountRate(totalQuantity, bulkScope);
    const bulkDiscount = subtotal * (bulkDiscountRate / 100);

    const finalTotal = subtotal - bulkDiscount;

    return {
      totalPrice: Math.round(finalTotal * 100) / 100,
      items: itemResults,
      bulkDiscounts: bulkDiscountRate > 0 ? [{
        ruleId: 0,
        ruleName: 'Volume Discount',
        totalDiscount: bulkDiscount,
        description: `${bulkDiscountRate}% discount for ${totalQuantity} items`,
      }] : [],
      summary: {
        subtotal,
        totalDiscounts: bulkDiscount,
        totalSurcharges: 0,
        totalTaxes: itemResults.reduce((sum, item) => sum + item.breakdown.taxes, 0),
        finalTotal,
      },
    };
  }

  /**
   * Get price quote without applying charges
   */
  async getQuote(request: PricingRequest): Promise<PricingResult> {
    return this.calculatePrice(request);
  }

  /**
   * Get bulk price quote
   */
  async getBulkQuote(request: BulkPricingRequest): Promise<BulkPricingResult> {
    return this.calculateBulkPrice(request);
  }

  /**
   * Calculate dynamic pricing based on demand/supply
   */
  async calculateDynamicPrice(
    request: PricingRequest,
    demandFactor: number = 1.0,
    supplyFactor: number = 1.0
  ): Promise<PricingResult> {
    const baseResult = await this.calculatePrice(request);
    
    // Apply dynamic pricing factors
    const dynamicMultiplier = Math.max(0.5, Math.min(2.0, demandFactor / supplyFactor));
    baseResult.totalPrice *= dynamicMultiplier;
    baseResult.breakdown.surcharges = baseResult.breakdown.subtotal * (dynamicMultiplier - 1);

    return baseResult;
  }

  /**
   * Validate pricing configuration for an operation
   */
  async validatePricingConfig(operationType: OperationType, scope: SettingsScope): Promise<{
    isValid: boolean;
    missingSettings: string[];
    warnings: string[];
  }> {
    const missingSettings: string[] = [];
    const warnings: string[] = [];

    // Check required base price settings
    const requiredSettings = this.getRequiredSettingsForOperation(operationType);
    
    for (const setting of requiredSettings) {
      const value = await settingsService.getSetting(setting, scope);
      if (value === null || value === undefined) {
        missingSettings.push(setting);
      }
    }

    // Check for potential configuration issues
    if (scope.customerTier === 'premium') {
      const premiumDiscount = await settingsService.getSetting('discount.premium_rate', scope);
      if (!premiumDiscount) {
        warnings.push('No premium customer discount configured');
      }
    }

    return {
      isValid: missingSettings.length === 0,
      missingSettings,
      warnings,
    };
  }

  /**
   * Get pricing history for analytics
   */
  async getPricingHistory(
    operationType: OperationType,
    scope: SettingsScope,
    fromDate: Date,
    toDate: Date
  ): Promise<Array<{
    date: Date;
    price: number;
    version: number;
  }>> {
    // This would query the settings audit table to get price changes over time
    // Implementation would depend on specific audit requirements
    return [];
  }

  /**
   * Private helper methods
   */
  private async calculateLeasePrice(basePrice: number, durationDays: number, scope: SettingsScope): Promise<number> {
    // Get daily lease rate
    const dailyRate = await settingsService.getSetting('lease.daily_rate', scope) || basePrice;
    
    // Check for monthly/weekly discount rates
    let totalPrice = dailyRate * durationDays;
    
    if (durationDays >= 30) {
      const monthlyDiscount = await settingsService.getSetting('lease.monthly_discount_rate', scope) || 0;
      totalPrice *= (1 - monthlyDiscount / 100);
    } else if (durationDays >= 7) {
      const weeklyDiscount = await settingsService.getSetting('lease.weekly_discount_rate', scope) || 0;
      totalPrice *= (1 - weeklyDiscount / 100);
    }

    return totalPrice;
  }

  private async calculateRefillPrice(basePrice: number, gasAmountKg: number, scope: SettingsScope): Promise<number> {
    // Base price is per kg, multiply by amount
    let totalPrice = basePrice * gasAmountKg;
    
    // Apply minimum charge if configured
    const minimumCharge = await settingsService.getSetting('refill.minimum_charge', scope);
    if (minimumCharge && totalPrice < minimumCharge) {
      totalPrice = minimumCharge;
    }

    return totalPrice;
  }

  private async getBulkDiscountRate(quantity: number, scope: SettingsScope): Promise<number> {
    // Check different volume tiers
    const volumeTiers = [
      { min: 100, setting: 'discount.volume_100_plus' },
      { min: 50, setting: 'discount.volume_50_plus' },
      { min: 20, setting: 'discount.volume_20_plus' },
      { min: 10, setting: 'discount.volume_10_plus' },
    ];

    for (const tier of volumeTiers) {
      if (quantity >= tier.min) {
        const discountRate = await settingsService.getSetting(tier.setting, scope);
        if (discountRate) {
          return discountRate;
        }
      }
    }

    return 0;
  }

  private getRequiredSettingsForOperation(operationType: OperationType): string[] {
    const settingsMap = {
      [OperationType.LEASE]: ['lease.base_price', 'lease.daily_rate'],
      [OperationType.REFILL]: ['refill.price_per_kg'],
      [OperationType.SWAP]: ['swap.fee'],
      [OperationType.GENERAL]: ['general.fee'],
    };

    return settingsMap[operationType] || [];
  }

  /**
   * Calculate estimated monthly revenue based on current pricing
   */
  async calculateRevenueProjection(
    operationType: OperationType,
    scope: SettingsScope,
    estimatedVolume: number
  ): Promise<{
    monthlyRevenue: number;
    averageTransactionValue: number;
    volumeBreakdown: Record<string, number>;
  }> {
    const basePrice = await settingsService.getPrice(operationType, scope);
    const averageTransactionValue = basePrice;
    const monthlyRevenue = averageTransactionValue * estimatedVolume;

    return {
      monthlyRevenue,
      averageTransactionValue,
      volumeBreakdown: {
        [operationType]: estimatedVolume,
      },
    };
  }

  /**
   * Get competitive pricing analysis
   */
  async getCompetitivePricing(
    operationType: OperationType,
    scope: SettingsScope
  ): Promise<{
    currentPrice: number;
    marketAverage: number;
    recommendation: 'increase' | 'decrease' | 'maintain';
    analysis: string;
  }> {
    const currentPrice = await settingsService.getPrice(operationType, scope);
    
    // This would integrate with external market data sources
    // For now, return mock analysis
    const marketAverage = currentPrice * 1.1; // Mock: 10% higher than current
    
    return {
      currentPrice,
      marketAverage,
      recommendation: currentPrice < marketAverage ? 'increase' : 'maintain',
      analysis: `Current pricing is ${currentPrice < marketAverage ? 'below' : 'at'} market average`,
    };
  }
}

export const pricingService = new PricingService();