import Joi from 'joi';
import { DataType, CustomerTier, OperationType } from '@models/BusinessSetting.model';

export const settingsValidation = {
  createOrUpdateSetting: Joi.object({
    key: Joi.string().min(2).max(200).required(),
    value: Joi.any().required(),
    categoryId: Joi.number().integer().positive().required(),
    dataType: Joi.string().valid(...Object.values(DataType)).default(DataType.STRING),
    scope: Joi.object({
      outletId: Joi.number().integer().positive().optional(),
      cylinderType: Joi.string().max(50).optional(),
      customerTier: Joi.string().valid(...Object.values(CustomerTier)).optional(),
      operationType: Joi.string().valid(...Object.values(OperationType)).optional(),
    }).optional(),
    priority: Joi.number().integer().min(0).max(9999).default(0),
    effectiveDate: Joi.date().iso().optional(),
    expiryDate: Joi.date().iso().greater(Joi.ref('effectiveDate')).optional(),
    reason: Joi.string().max(500).optional(),
  }),

  deleteSetting: Joi.object({
    id: Joi.string().pattern(/^\d+$/).required(),
    reason: Joi.string().max(500).optional(),
  }),

  calculatePrice: Joi.object({
    operationType: Joi.string().valid(...Object.values(OperationType)).required(),
    cylinderType: Joi.string().max(50).optional(),
    cylinderSize: Joi.string().max(20).optional(),
    quantity: Joi.number().integer().positive().default(1),
    customerTier: Joi.string().valid(...Object.values(CustomerTier)).optional(),
    outletId: Joi.number().integer().positive().optional(),
    customerId: Joi.number().integer().positive().optional(),
    duration: Joi.number().integer().positive().optional(),
    gasAmount: Joi.number().positive().optional(),
  }),

  calculateBulkPrice: Joi.object({
    operationType: Joi.string().valid(...Object.values(OperationType)).required(),
    items: Joi.array().items(
      Joi.object({
        cylinderType: Joi.string().max(50).required(),
        cylinderSize: Joi.string().max(20).optional(),
        quantity: Joi.number().integer().positive().required(),
        gasAmount: Joi.number().positive().optional(),
      })
    ).min(1).required(),
    customerTier: Joi.string().valid(...Object.values(CustomerTier)).optional(),
    outletId: Joi.number().integer().positive().optional(),
    customerId: Joi.number().integer().positive().optional(),
    duration: Joi.number().integer().positive().optional(),
  }),

  importSettings: Joi.object({
    settings: Joi.array().items(
      Joi.object({
        settingKey: Joi.string().min(2).max(200).required(),
        settingValue: Joi.any().required(),
        categoryId: Joi.number().integer().positive().required(),
        dataType: Joi.string().valid(...Object.values(DataType)).required(),
        outletId: Joi.number().integer().positive().optional(),
        cylinderType: Joi.string().max(50).optional(),
        customerTier: Joi.string().valid(...Object.values(CustomerTier)).optional(),
        operationType: Joi.string().valid(...Object.values(OperationType)).optional(),
        priority: Joi.number().integer().min(0).max(9999).default(0),
        effectiveDate: Joi.date().iso().optional(),
        expiryDate: Joi.date().iso().optional(),
      })
    ).min(1).required(),
    overwriteExisting: Joi.boolean().default(false),
  }),

  querySettings: Joi.object({
    page: Joi.number().integer().positive().default(1),
    limit: Joi.number().integer().positive().max(100).default(50),
    category: Joi.string().max(100).optional(),
    search: Joi.string().max(200).optional(),
    isActive: Joi.boolean().optional(),
    effectiveOnly: Joi.boolean().default(true),
    outletId: Joi.number().integer().positive().optional(),
    cylinderType: Joi.string().max(50).optional(),
    customerTier: Joi.string().valid(...Object.values(CustomerTier)).optional(),
    operationType: Joi.string().valid(...Object.values(OperationType)).optional(),
  }),

  getSetting: Joi.object({
    key: Joi.string().min(2).max(200).required(),
    outletId: Joi.number().integer().positive().optional(),
    cylinderType: Joi.string().max(50).optional(),
    customerTier: Joi.string().valid(...Object.values(CustomerTier)).optional(),
    operationType: Joi.string().valid(...Object.values(OperationType)).optional(),
  }),

  getQuote: Joi.object({
    operationType: Joi.string().valid(...Object.values(OperationType)).required(),
    cylinderType: Joi.string().max(50).optional(),
    cylinderSize: Joi.string().max(20).optional(),
    quantity: Joi.number().integer().positive().default(1),
    customerTier: Joi.string().valid(...Object.values(CustomerTier)).optional(),
    outletId: Joi.number().integer().positive().optional(),
    customerId: Joi.number().integer().positive().optional(),
    duration: Joi.number().integer().positive().optional(),
    gasAmount: Joi.number().positive().optional(),
  }),

  validatePricingConfig: Joi.object({
    operationType: Joi.string().valid(...Object.values(OperationType)).required(),
    outletId: Joi.number().integer().positive().optional(),
    cylinderType: Joi.string().max(50).optional(),
    customerTier: Joi.string().valid(...Object.values(CustomerTier)).optional(),
  }),

  getRevenueProjection: Joi.object({
    operationType: Joi.string().valid(...Object.values(OperationType)).required(),
    estimatedVolume: Joi.number().integer().positive().required(),
    outletId: Joi.number().integer().positive().optional(),
    cylinderType: Joi.string().max(50).optional(),
    customerTier: Joi.string().valid(...Object.values(CustomerTier)).optional(),
  }),
};