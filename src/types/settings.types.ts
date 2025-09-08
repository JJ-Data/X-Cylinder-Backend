// Settings system type definitions

// Base attribute interfaces for models
export interface SettingCategoryAttributes {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingCategoryCreationAttributes {
  name: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface BusinessSettingAttributes {
  id: number;
  categoryId: number;
  settingKey: string;
  settingValue: any;
  dataType: 'string' | 'number' | 'boolean' | 'json' | 'array';
  outletId?: number;
  cylinderType?: string;
  operationType?: 'LEASE' | 'REFILL' | 'SWAP' | 'GENERAL';
  isActive: boolean;
  createdBy: number;
  updatedBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessSettingCreationAttributes {
  categoryId: number;
  settingKey: string;
  settingValue: any;
  dataType?: 'string' | 'number' | 'boolean' | 'json' | 'array';
  outletId?: number;
  cylinderType?: string;
  operationType?: 'LEASE' | 'REFILL' | 'SWAP' | 'GENERAL';
  isActive?: boolean;
  createdBy: number;
  updatedBy: number;
}

export interface PricingRuleAttributes {
  id: number;
  name: string;
  description?: string;
  ruleType: 'base_price' | 'discount' | 'surcharge' | 'conditional' | 'volume_discount';
  conditions: Array<{
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between' | 'contains';
    value: any;
    logicalOperator?: 'AND' | 'OR';
  }>;
  actions: {
    type: 'fixed_amount' | 'percentage' | 'formula';
    value: number;
    maxDiscount?: number;
    minCharge?: number;
    formula?: string;
  };
  appliesTo: {
    operations: string[];
    cylinderTypes?: string[];
    customerTiers?: string[];
    timeRanges?: Array<{
      start: string;
      end: string;
      days?: string[];
    }>;
  };
  outletIds?: number[];
  priority: number;
  isActive: boolean;
  effectiveDate: Date;
  expiryDate?: Date;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingRuleCreationAttributes {
  name: string;
  description?: string;
  ruleType: 'base_price' | 'discount' | 'surcharge' | 'conditional' | 'volume_discount';
  conditions: Array<{
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between' | 'contains';
    value: any;
    logicalOperator?: 'AND' | 'OR';
  }>;
  actions: {
    type: 'fixed_amount' | 'percentage' | 'formula';
    value: number;
    maxDiscount?: number;
    minCharge?: number;
    formula?: string;
  };
  appliesTo: {
    operations: string[];
    cylinderTypes?: string[];
    customerTiers?: string[];
    timeRanges?: Array<{
      start: string;
      end: string;
      days?: string[];
    }>;
  };
  outletIds?: number[];
  priority?: number;
  isActive?: boolean;
  effectiveDate?: Date;
  expiryDate?: Date;
  createdBy: number;
}

export interface SettingsAuditAttributes {
  id: number;
  settingId?: number;
  ruleId?: number;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  oldValue?: any;
  newValue?: any;
  changedBy: number;
  changeReason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface SettingsAuditCreationAttributes {
  settingId?: number;
  ruleId?: number;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  oldValue?: any;
  newValue?: any;
  changedBy: number;
  changeReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SettingCategoryResponse {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  displayOrder: number;
  settingsCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessSettingResponse {
  id: number;
  categoryId: number;
  settingKey: string;
  settingValue: any;
  dataType: 'string' | 'number' | 'boolean' | 'json' | 'array';
  outletId?: number;
  cylinderType?: string;
  customerTier?: 'regular' | 'business' | 'premium';
  operationType?: 'LEASE' | 'REFILL' | 'SWAP' | 'GENERAL';
  effectiveDate: Date;
  expiryDate?: Date;
  priority: number;
  isActive: boolean;
  version: number;
  createdBy: number;
  updatedBy: number;
  createdAt: Date;
  updatedAt: Date;
  category?: SettingCategoryResponse;
  outlet?: {
    id: number;
    name: string;
    location: string;
  };
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  updater?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PricingRuleResponse {
  id: number;
  name: string;
  description?: string;
  ruleType: 'base_price' | 'discount' | 'surcharge' | 'conditional' | 'volume_discount';
  conditions: Array<{
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between' | 'contains';
    value: any;
    logicalOperator?: 'AND' | 'OR';
  }>;
  actions: {
    type: 'fixed_amount' | 'percentage' | 'formula';
    value: number;
    maxDiscount?: number;
    minCharge?: number;
    formula?: string;
  };
  appliesTo: {
    operations: string[];
    cylinderTypes?: string[];
    customerTiers?: string[];
    timeRanges?: Array<{
      start: string;
      end: string;
      days?: string[];
    }>;
  };
  outletIds?: number[];
  priority: number;
  isActive: boolean;
  effectiveDate: Date;
  expiryDate?: Date;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  outlets?: Array<{
    id: number;
    name: string;
    location: string;
  }>;
}

export interface SettingsAuditResponse {
  id: number;
  settingId?: number;
  ruleId?: number;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  oldValue?: any;
  newValue?: any;
  changedBy: number;
  changeReason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  setting?: BusinessSettingResponse;
  rule?: PricingRuleResponse;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  formattedChanges?: string;
}

// DTOs for creating/updating settings
export interface CreateSettingCategoryDto {
  name: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
}

export interface UpdateSettingCategoryDto extends Partial<CreateSettingCategoryDto> {
  isActive?: boolean;
}

export interface CreateBusinessSettingDto {
  categoryId: number;
  settingKey: string;
  settingValue: any;
  dataType?: 'string' | 'number' | 'boolean' | 'json' | 'array';
  outletId?: number;
  cylinderType?: string;
  customerTier?: 'regular' | 'business' | 'premium';
  operationType?: 'LEASE' | 'REFILL' | 'SWAP' | 'GENERAL';
  effectiveDate?: Date;
  expiryDate?: Date;
  priority?: number;
  changeReason?: string;
}

export interface UpdateBusinessSettingDto extends Partial<CreateBusinessSettingDto> {
  isActive?: boolean;
}

export interface CreatePricingRuleDto {
  name: string;
  description?: string;
  ruleType: 'base_price' | 'discount' | 'surcharge' | 'conditional' | 'volume_discount';
  conditions: Array<{
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between' | 'contains';
    value: any;
    logicalOperator?: 'AND' | 'OR';
  }>;
  actions: {
    type: 'fixed_amount' | 'percentage' | 'formula';
    value: number;
    maxDiscount?: number;
    minCharge?: number;
    formula?: string;
  };
  appliesTo: {
    operations: string[];
    cylinderTypes?: string[];
    customerTiers?: string[];
    timeRanges?: Array<{
      start: string;
      end: string;
      days?: string[];
    }>;
  };
  outletIds?: number[];
  priority?: number;
  effectiveDate?: Date;
  expiryDate?: Date;
  changeReason?: string;
}

export interface UpdatePricingRuleDto extends Partial<CreatePricingRuleDto> {
  isActive?: boolean;
}

// Query interfaces
export interface SettingsQueryParams {
  categoryId?: number;
  category?: string;
  outletId?: number;
  cylinderType?: string;
  customerTier?: 'regular' | 'business' | 'premium';
  operationType?: 'LEASE' | 'REFILL' | 'SWAP' | 'GENERAL';
  isActive?: boolean;
  search?: string;
  effectiveOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  scope?: SettingsScope;
}

export interface PricingRulesQueryParams {
  ruleType?: 'base_price' | 'discount' | 'surcharge' | 'conditional' | 'volume_discount';
  outletId?: number;
  isActive?: boolean;
  search?: string;
  effectiveOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AuditQueryParams {
  settingId?: number;
  ruleId?: number;
  changedBy?: number;
  action?: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

// Pricing calculation interfaces
export interface PricingContext {
  operation: 'LEASE' | 'REFILL' | 'SWAP' | 'REGISTRATION' | 'PENALTY' | 'DEPOSIT';
  cylinderType?: string;
  customerTier?: 'regular' | 'business' | 'premium';
  outletId?: number;
  quantity?: number;
  basePrice?: number;
  currentTime?: Date;
  inventoryLevel?: number;
  customerHistory?: {
    totalLeases?: number;
    totalSpent?: number;
    averageVolume?: number;
    lastLeaseDate?: Date;
  };
}

export interface PricingResult {
  basePrice: number;
  finalPrice: number;
  appliedRules: Array<{
    ruleId: number;
    ruleName: string;
    ruleType: string;
    adjustment: number;
    adjustmentType: 'fixed_amount' | 'percentage' | 'formula';
  }>;
  breakdown: {
    subtotal: number;
    discounts: number;
    surcharges: number;
    total: number;
  };
  savings?: number;
  context: PricingContext;
  calculatedAt: Date;
}

// Bulk operations
export interface BulkSettingsImportDto {
  settings: CreateBusinessSettingDto[];
  rules?: CreatePricingRuleDto[];
  replaceExisting?: boolean;
  validateOnly?: boolean;
}

export interface BulkSettingsImportResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  createdSettings: number[];
  createdRules: number[];
  skippedSettings: number[];
  skippedRules: number[];
}

// Settings hierarchy
export interface SettingsHierarchy {
  global: BusinessSettingResponse[];
  outlet?: {
    [outletId: number]: BusinessSettingResponse[];
  };
  cylinderType?: {
    [cylinderType: string]: BusinessSettingResponse[];
  };
  combined: BusinessSettingResponse[];
  effectiveValues: {
    [settingKey: string]: {
      value: any;
      source: 'global' | 'outlet' | 'cylinder_type' | 'customer_tier';
      priority: number;
      settingId: number;
    };
  };
}

// Common setting keys (constants)
export const SETTING_KEYS = {
  // Lease pricing
  LEASE_BASE_PRICE: 'lease.base_price',
  LEASE_DEPOSIT: 'lease.deposit',
  LEASE_DURATION_LIMIT: 'lease.duration_limit_days',
  
  // Refill pricing
  REFILL_PRICE_PER_KG: 'refill.price_per_kg',
  REFILL_MINIMUM_CHARGE: 'refill.minimum_charge',
  REFILL_BULK_DISCOUNT: 'refill.bulk_discount_threshold',
  
  // Swap pricing
  SWAP_FEE: 'swap.fee',
  SWAP_POOR_CONDITION_FEE: 'swap.poor_condition_fee',
  SWAP_DAMAGED_CONDITION_FEE: 'swap.damaged_condition_fee',
  
  // Registration
  REGISTRATION_FEE: 'registration.fee',
  ACTIVATION_TIMEOUT: 'registration.activation_timeout_hours',
  
  // Penalties
  LATE_RETURN_PENALTY: 'penalty.late_return_per_day',
  DAMAGE_ASSESSMENT_FEE: 'penalty.damage_assessment',
  LOST_CYLINDER_CHARGE: 'penalty.lost_cylinder',
  PENALTY_RATE: 'penalty.rate',
  DEPOSIT_AMOUNT: 'deposit.amount',
  
  // Business rules
  MAX_ACTIVE_LEASES: 'business.max_active_leases_per_customer',
  INVENTORY_LOW_THRESHOLD: 'business.inventory_low_threshold',
  AUTO_REFILL_TRIGGER: 'business.auto_refill_trigger_level',
} as const;

export type SettingKey = typeof SETTING_KEYS[keyof typeof SETTING_KEYS];

// Settings scope interface
export interface SettingsScope {
  outletId?: number;
  cylinderType?: string;
  customerTier?: 'regular' | 'business' | 'premium';
  operationType?: 'LEASE' | 'REFILL' | 'SWAP' | 'GENERAL';
  quantity?: number;
  cylinderSize?: string;
}