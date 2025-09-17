import { simplifiedSettingsService } from './settings-simplified.service';
import { OperationType } from '@models/BusinessSetting.model';

export interface SimplePricingRequest {
  operationType: OperationType;
  cylinderType?: string;
  quantity?: number;
  outletId?: number;
  duration?: number; // For lease operations (in days)
  gasAmount?: number; // For refill operations (in kg)
  condition?: 'good' | 'poor' | 'damaged'; // For swap and return operations
}

export interface SimplePricingResult {
  basePrice: number;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  taxType: 'inclusive' | 'exclusive';
  totalPrice: number;
  deposit?: number;
  breakdown: {
    unitPrice: number;
    quantity: number;
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    taxType: 'inclusive' | 'exclusive';
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
    
    // Get tax configuration
    const taxRate = await simplifiedSettingsService.getSetting('tax.rate', request.outletId) || 0;
    const taxType = await simplifiedSettingsService.getSetting('tax.type', request.outletId) || 'exclusive';
    
    let subtotal = totalPrice;
    let taxAmount = 0;
    let finalTotal = totalPrice;
    
    if (taxRate > 0) {
      if (taxType === 'inclusive') {
        // Tax is included in the price - extract it
        taxAmount = totalPrice * (taxRate / (100 + taxRate));
        subtotal = totalPrice - taxAmount;
        finalTotal = totalPrice;
      } else {
        // Tax is exclusive - add it on top
        taxAmount = totalPrice * (taxRate / 100);
        subtotal = totalPrice;
        finalTotal = totalPrice + taxAmount;
      }
    }
    
    return {
      basePrice,
      subtotal,
      taxAmount,
      taxRate,
      taxType: taxType as 'inclusive' | 'exclusive',
      totalPrice: finalTotal,
      deposit,
      breakdown: {
        unitPrice: basePrice,
        quantity: request.quantity || 1,
        subtotal,
        taxAmount,
        taxRate,
        taxType: taxType as 'inclusive' | 'exclusive',
        depositAmount: deposit,
      },
    };
  }

  /**
   * Calculate lease pricing - per KG basis
   */
  private async calculateLeasePrice(request: SimplePricingRequest): Promise<{
    basePrice: number;
    totalPrice: number;
    deposit: number;
  }> {
    const cylinderType = request.cylinderType || '12kg';
    
    // Extract cylinder size from cylinderType (e.g., "12kg" -> 12)
    const cylinderSize = parseInt(cylinderType.replace(/[^\d]/g, '')) || 12;
    
    // Get per-KG pricing
    const feePerKg = await simplifiedSettingsService.getSetting('lease.fee_per_kg', request.outletId) || 1000;
    const depositPerKg = await simplifiedSettingsService.getSetting('lease.deposit_per_kg', request.outletId) || 500;
    
    // Calculate total lease cost (one-time fee based on cylinder size)
    const totalPrice = feePerKg * cylinderSize;
    
    // Calculate deposit based on cylinder size
    const deposit = depositPerKg * cylinderSize;
    
    return { 
      basePrice: feePerKg, // Per-KG rate for breakdown
      totalPrice, 
      deposit 
    };
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
   * Calculate swap fee based on cylinder condition
   */
  private async calculateSwapFee(request: SimplePricingRequest): Promise<{
    basePrice: number;
    totalPrice: number;
  }> {
    const condition = request.condition || 'good';
    
    // Get appropriate fee percentage based on condition
    let feeKey = 'swap.fee.good';
    if (condition === 'poor') {
      feeKey = 'swap.fee.poor';
    } else if (condition === 'damaged') {
      feeKey = 'swap.fee.damaged';
    }
    
    const swapFeePercentage = await simplifiedSettingsService.getSetting(feeKey, request.outletId) || 0;
    
    // Calculate fee as percentage of deposit (for consistency with return penalties)
    // Get the deposit amount for the cylinder type
    const cylinderType = request.cylinderType || '12kg';
    const cylinderSize = parseInt(cylinderType.replace(/[^\d]/g, '')) || 12;
    const depositPerKg = await simplifiedSettingsService.getSetting('lease.deposit_per_kg', request.outletId) || 500;
    const depositAmount = depositPerKg * cylinderSize;
    
    // Calculate swap fee as percentage of deposit
    const swapFee = (depositAmount * swapFeePercentage) / 100;
    
    return { basePrice: swapFee, totalPrice: swapFee };
  }
  
  /**
   * Calculate return penalty based on cylinder condition and deposit amount
   */
  async calculateReturnPenalty(condition: string, depositAmount: number, outletId?: number): Promise<number> {
    let penaltyKey = 'return.penalty.good';
    
    if (condition === 'poor') {
      penaltyKey = 'return.penalty.poor';
    } else if (condition === 'damaged') {
      penaltyKey = 'return.penalty.damaged';
    }
    
    // Get penalty percentage
    const penaltyPercentage = await simplifiedSettingsService.getSetting(penaltyKey, outletId) || 0;
    
    // Calculate penalty as percentage of deposit
    return (depositAmount * penaltyPercentage) / 100;
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
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    taxType: 'inclusive' | 'exclusive';
    total: number;
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
        description = `Lease fee for ${cylinderType || '12kg'} cylinder (per-KG pricing)`;
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
      subtotal: result.subtotal,
      taxAmount: result.taxAmount,
      taxRate: result.taxRate,
      taxType: result.taxType,
      total: result.totalPrice,
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
      'lease.fee_per_kg',
      'lease.deposit_per_kg',
      'return.penalty.good',
      'return.penalty.poor',
      'return.penalty.damaged',
      'refill.price_per_kg',
      'swap.fee.good',
      'swap.fee.poor',
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