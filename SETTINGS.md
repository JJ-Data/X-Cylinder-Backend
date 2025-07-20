# CylinderX Settings System Documentation

## Overview

The CylinderX Settings System provides a comprehensive, hierarchical configuration management solution that replaces all hardcoded pricing and business rules with dynamic, admin-configurable settings.

## Features

### ✅ **Hierarchical Settings Resolution**
Settings are resolved in order of specificity:
1. **Customer Tier + Cylinder Type + Outlet** (most specific)
2. **Customer Tier + Cylinder Type** 
3. **Cylinder Type + Outlet**
4. **Customer Tier Only**
5. **Cylinder Type Only**
6. **Outlet Only**
7. **Global Settings** (fallback)

### ✅ **Dynamic Pricing Calculator**
- Context-aware price calculation based on operation type, cylinder type, customer tier, and outlet
- Duration-based pricing for leases (daily rates with weekly/monthly discounts)
- Volume-based pricing for refills (per-kg with minimum charges)
- Automatic bulk discounts and customer tier discounts
- Real-time pricing quotes

### ✅ **Admin Controls**
- Only admin users can create, update, or delete settings
- Complete CRUD operations via REST API
- Settings validation and error handling
- Import/export functionality for bulk configuration

### ✅ **Audit Trail**
- Complete change tracking with user attribution
- Before/after value logging
- IP address and user agent tracking
- Change reason documentation

## Database Schema

### Settings Categories
Organize settings into logical groups:
- **PRICING** - General pricing settings
- **LEASE** - Cylinder lease specific settings
- **REFILL** - Gas refill operations and pricing
- **SWAP** - Cylinder swap operations and fees
- **REGISTRATION** - Customer registration and onboarding
- **PENALTIES** - Penalty rates and fines
- **DEPOSITS** - Security deposit amounts
- **BUSINESS_RULES** - General business operation rules
- **DISCOUNTS** - Customer tier and volume discounts
- **TAXES** - Tax rates and calculations

### Business Settings
Core settings with hierarchical scoping:
```sql
CREATE TABLE business_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL,
  setting_key VARCHAR(200) NOT NULL,
  setting_value JSON NOT NULL,
  data_type ENUM('string', 'number', 'boolean', 'json', 'array'),
  
  -- Hierarchical scope fields
  outlet_id INT NULL,
  cylinder_type VARCHAR(50) NULL,
  customer_tier ENUM('regular', 'business', 'premium') NULL,
  operation_type ENUM('LEASE', 'REFILL', 'SWAP', 'REGISTRATION', 'PENALTY', 'DEPOSIT') NULL,
  
  -- Temporal settings
  effective_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiry_date DATETIME NULL,
  
  -- Priority and versioning
  priority INT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit fields
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

## API Endpoints

### Settings Management

#### Get All Settings
```http
GET /api/settings?page=1&limit=50&category=PRICING&search=lease
```

#### Get Setting by Key
```http
GET /api/settings/key/lease.base_price?outletId=1&customerTier=business
```

#### Get Settings by Category
```http
GET /api/settings/category/PRICING?outletId=1&cylinderType=5kg
```

#### Create/Update Setting (Admin Only)
```http
POST /api/settings
Content-Type: application/json

{
  "key": "lease.base_price",
  "value": 50.00,
  "categoryId": 2,
  "dataType": "number",
  "scope": {
    "outletId": 1,
    "cylinderType": "5kg",
    "customerTier": "business",
    "operationType": "LEASE"
  },
  "priority": 1,
  "effectiveDate": "2025-01-01T00:00:00Z",
  "reason": "Updated pricing for business customers"
}
```

### Pricing Calculations

#### Calculate Single Operation Price
```http
POST /api/settings/price/calculate
Content-Type: application/json

{
  "operationType": "LEASE",
  "cylinderType": "5kg",
  "quantity": 1,
  "customerTier": "business",
  "outletId": 1,
  "duration": 30
}
```

#### Calculate Bulk Pricing
```http
POST /api/settings/price/bulk
Content-Type: application/json

{
  "operationType": "REFILL",
  "items": [
    {"cylinderType": "5kg", "quantity": 10, "gasAmount": 50},
    {"cylinderType": "10kg", "quantity": 5, "gasAmount": 40}
  ],
  "customerTier": "business",
  "outletId": 1
}
```

#### Get Pricing Quote
```http
GET /api/settings/quote?operationType=LEASE&cylinderType=5kg&customerTier=business&quantity=1&duration=30
```

### Lease Pricing Integration

#### Get Lease Pricing Quote
```http
GET /api/leases/quote?cylinderType=5kg&customerTier=business&duration=30
```

Response:
```json
{
  "success": true,
  "data": {
    "leaseAmount": 75.00,
    "depositAmount": 150.00,
    "duration": 30,
    "cylinderType": "5kg",
    "customerTier": "business",
    "breakdown": {
      "lease": {
        "unitPrice": 2.50,
        "quantity": 30,
        "subtotal": 75.00,
        "discounts": 7.50,
        "taxes": 6.38
      },
      "deposit": {
        "unitPrice": 150.00,
        "quantity": 1,
        "subtotal": 150.00,
        "taxes": 12.75
      }
    }
  }
}
```

## Service Integration

### Automatic Pricing in Services

#### Lease Service
```typescript
// Create lease with automatic pricing
const lease = await leaseService.createLease({
  customerId: 123,
  cylinderCode: "CYL001",
  expectedReturnDate: new Date("2025-02-01"),
  // depositAmount and leaseAmount are optional - calculated automatically
  duration: 30
}, staffId, outletId);
```

#### Refill Service
```typescript
// Create refill with automatic pricing
const refill = await refillService.createRefill({
  cylinderId: 456,
  preRefillVolume: 2.5,
  postRefillVolume: 12.0,
  // refillCost is optional - calculated automatically based on gas amount
}, operatorId, outletId);
```

#### Swap Service
```typescript
// Create swap with automatic condition-based pricing
const swap = await swapService.createSwap({
  leaseId: 789,
  newCylinderId: 101,
  condition: "poor", // Uses swap.poor_condition_fee setting
  // swapFee is optional - calculated automatically
}, staffId);
```

## Default Settings

The system comes pre-configured with default settings:

### Lease Pricing
- `lease.base_price`: $50.00
- `lease.daily_rate`: $2.50
- `lease.deposit`: $100.00

### Refill Pricing
- `refill.price_per_kg`: $15.00
- `refill.minimum_charge`: $25.00

### Swap Pricing
- `swap.fee`: $10.00
- `swap.poor_condition_fee`: $50.00
- `swap.damaged_condition_fee`: $100.00

### Registration & Penalties
- `registration.fee`: $20.00
- `penalty.rate`: $5.00
- `penalty.late_return_per_day`: $2.00
- `deposit.amount`: $150.00

### Business Rules
- `business.max_active_leases_per_customer`: 5
- `business.inventory_low_threshold`: 10
- `tax.rate`: 8.5%

### Customer Tier Discounts
- `discount.business_tier`: 10%
- `discount.premium_tier`: 15%

### Volume Discounts
- `discount.volume_10_plus`: 5%
- `discount.volume_20_plus`: 8%
- `discount.volume_50_plus`: 12%

## Usage Examples

### Scenario 1: Setting Outlet-Specific Pricing
```javascript
// Set higher lease prices for premium outlet
await settingsService.setSetting('lease.base_price', 60.00, {
  categoryId: 2,
  dataType: 'number',
  scope: { outletId: 3 }, // Premium outlet
  createdBy: adminUserId,
  reason: 'Premium location pricing'
});
```

### Scenario 2: Customer Tier Specific Discounts
```javascript
// Give business customers 15% discount on all operations
await settingsService.setSetting('discount.business_tier', 15.0, {
  categoryId: 9,
  dataType: 'number',
  scope: { customerTier: 'business' },
  createdBy: adminUserId,
  reason: 'Increased business customer discount'
});
```

### Scenario 3: Cylinder Type Specific Pricing
```javascript
// Set premium pricing for large cylinders
await settingsService.setSetting('lease.base_price', 80.00, {
  categoryId: 2,
  dataType: 'number',
  scope: { cylinderType: '50kg' },
  createdBy: adminUserId,
  reason: 'Premium pricing for large cylinders'
});
```

### Scenario 4: Temporary Promotional Pricing
```javascript
// Limited time discount for new customers
await settingsService.setSetting('registration.fee', 10.00, {
  categoryId: 5,
  dataType: 'number',
  effectiveDate: new Date('2025-01-01'),
  expiryDate: new Date('2025-03-31'),
  createdBy: adminUserId,
  reason: 'Q1 2025 new customer promotion'
});
```

## Best Practices

### 1. **Hierarchical Configuration**
- Start with global settings as defaults
- Add outlet-specific overrides for location-based pricing
- Use customer tier settings for loyalty programs
- Apply cylinder type settings for premium/economy pricing

### 2. **Temporal Settings**
- Set effective dates for future price changes
- Use expiry dates for temporary promotions
- Monitor and update settings regularly

### 3. **Audit and Compliance**
- Always provide change reasons
- Review audit logs regularly
- Document pricing strategy decisions

### 4. **Testing**
- Test pricing calculations in staging environment
- Validate settings with sample data
- Monitor pricing accuracy after deployment

### 5. **Performance**
- Settings are cached for fast retrieval
- Use bulk operations for large configuration changes
- Monitor API performance with settings queries

## Security

- All settings modification requires admin role
- Audit trail tracks all changes with user attribution
- Settings validation prevents invalid configurations
- Rate limiting on settings API endpoints

## Migration Guide

### From Hardcoded Prices
1. Identify all hardcoded price values
2. Create corresponding settings in appropriate categories
3. Update code to use `settingsService.getSetting()` or `pricingService.calculatePrice()`
4. Test thoroughly in staging environment
5. Deploy with database seeds for default values

### Setting Keys Convention
- Use dot notation for hierarchy: `category.specific_setting`
- Include operation type when relevant: `lease.base_price`
- Use descriptive names: `swap.poor_condition_fee` not `swap.fee2`
- Follow existing patterns for consistency

This documentation provides a complete guide to the CylinderX Settings System. The system is designed to be flexible, scalable, and admin-friendly while maintaining strong audit trails and performance.