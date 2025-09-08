import { simplifiedSettingsService } from './settings-simplified.service';
import { OperationType } from '@models/BusinessSetting.model';

export interface SimplePricingRequest {
  operationType: OperationType;
  cylinderType?: string;
  quantity?: number;
  outletId?: number;
  duration?: number; // For lease operations (in days)
  gasAmount?: number; // For refill operations (in kg)
  condition?: 'standard' | 'damaged'; // For swap operations
}

export interface SimplePricingResult {
  basePrice: number;
  totalPrice: number;
  deposit?: number;
  tax?: number;
  breakdown: {
    unitPrice: number;
    quantity: number;
    subtotal: number;
    taxAmount: number;
    depositAmount?: number;
  };
}

export class SimplifiedPricingService {
  /**
   * Calculate price for any operation
   */
  async calculatePrice(request: SimplePricingRequest): Promise<SimplePricingResult> {
    let basePrice = 0;
    let totalPrice = 0;
    let deposit = 0;
    
    switch (request.operationType) {
      case OperationType.LEASE:
        const leaseResult = await this.calculateLeasePrice(request);
        basePrice = leaseResult.basePrice;
        totalPrice = leaseResult.totalPrice;
        deposit = leaseResult.deposit;
        break;
        
      case OperationType.REFILL:
        const refillResult = await this.calculateRefillPrice(request);
        basePrice = refillResult.basePrice;
        totalPrice = refillResult.totalPrice;
        break;
        
      case OperationType.SWAP:
        const swapResult = await this.calculateSwapFee(request);
        basePrice = swapResult.basePrice;
        totalPrice = swapResult.totalPrice;
        break;
        
      default:
        throw new Error(`Unsupported operation type: ${request.operationType}`);
    }
    
    // Apply tax if configured
    const taxRate = await simplifiedSettingsService.getSetting('tax.rate', request.outletId) || 0;
    const taxAmount = totalPrice * (taxRate / 100);
    const finalTotal = totalPrice + taxAmount;
    
    return {
      basePrice,
      totalPrice: finalTotal,
      deposit,
      tax: taxAmount,
      breakdown: {
        unitPrice: basePrice,
        quantity: request.quantity || 1,
        subtotal: totalPrice,
        taxAmount,
        depositAmount: deposit,
      },
    };
  }

  /**
   * Calculate lease pricing
   */
  private async calculateLeasePrice(request: SimplePricingRequest): Promise<{
    basePrice: number;
    totalPrice: number;
    deposit: number;
  }> {
    const cylinderType = request.cylinderType || '12kg';
    const duration = request.duration || 1;
    
    // Get daily rate
    const dailyRateKey = `lease.base_price.${cylinderType}`;
    const basePrice = await simplifiedSettingsService.getSetting(dailyRateKey, request.outletId) || 50;
    
    // Calculate total lease cost
    const totalPrice = basePrice * duration;
    
    // Get deposit
    const depositKey = `lease.deposit.${cylinderType}`;
    const deposit = await simplifiedSettingsService.getSetting(depositKey, request.outletId) || 500;
    
    return { basePrice, totalPrice, deposit };
  }

  /**
   * Calculate refill pricing
   */
  private async calculateRefillPrice(request: SimplePricingRequest): Promise<{
    basePrice: number;
    totalPrice: number;
  }> {
    const gasAmount = request.gasAmount || 1;
    
    // Get price per kg
    const pricePerKg = await simplifiedSettingsService.getSetting('refill.price_per_kg', request.outletId) || 10;
    
    // Calculate total
    let totalPrice = pricePerKg * gasAmount;
    
    // Apply minimum charge if configured
    const minimumCharge = await simplifiedSettingsService.getSetting('refill.minimum_charge', request.outletId) || 0;
    if (minimumCharge > 0 && totalPrice < minimumCharge) {
      totalPrice = minimumCharge;
    }
    
    return { basePrice: pricePerKg, totalPrice };
  }

  /**
   * Calculate swap fee
   */
  private async calculateSwapFee(request: SimplePricingRequest): Promise<{
    basePrice: number;
    totalPrice: number;
  }> {
    const condition = request.condition || 'standard';
    
    // Get appropriate fee based on condition
    const feeKey = condition === 'damaged' ? 'swap.fee.damaged' : 'swap.fee.standard';
    const swapFee = await simplifiedSettingsService.getSetting(feeKey, request.outletId) || 0;
    
    return { basePrice: swapFee, totalPrice: swapFee };
  }

  /**
   * Get a simple price quote
   */
  async getQuote(
    operationType: OperationType,
    cylinderType?: string,
    outletId?: number
  ): Promise<{
    price: number;
    deposit?: number;
    description: string;
  }> {
    const request: SimplePricingRequest = {
      operationType,
      cylinderType,
      outletId,
      quantity: 1,
    };
    
    const result = await this.calculatePrice(request);
    
    let description = '';
    switch (operationType) {
      case OperationType.LEASE:
        description = `Daily lease rate for ${cylinderType || '12kg'} cylinder`;
        break;
      case OperationType.REFILL:
        description = 'Gas refill price per kg';
        break;
      case OperationType.SWAP:
        description = 'Standard cylinder swap fee';
        break;
    }
    
    return {
      price: result.basePrice,
      deposit: result.deposit,
      description,
    };
  }

  /**
   * Calculate late fees for overdue leases
   */
  async calculateLateFee(daysOverdue: number, outletId?: number): Promise<number> {
    const dailyLateFee = await simplifiedSettingsService.getSetting('late.fee.daily', outletId) || 10;
    return dailyLateFee * daysOverdue;
  }

  /**
   * Validate pricing configuration
   */
  async validatePricingConfig(outletId?: number): Promise<{
    isValid: boolean;
    missingSettings: string[];
  }> {
    const requiredSettings = [
      'lease.base_price.12kg',
      'lease.base_price.25kg',
      'lease.base_price.50kg',
      'lease.deposit.12kg',
      'lease.deposit.25kg',
      'lease.deposit.50kg',
      'refill.price_per_kg',
      'swap.fee.standard',
      'swap.fee.damaged',
    ];
    
    const missingSettings: string[] = [];
    
    for (const key of requiredSettings) {
      const value = await simplifiedSettingsService.getSetting(key, outletId);
      if (value === null || value === undefined) {
        missingSettings.push(key);
      }
    }
    
    return {
      isValid: missingSettings.length === 0,
      missingSettings,
    };
  }
}

export const simplifiedPricingService = new SimplifiedPricingService();