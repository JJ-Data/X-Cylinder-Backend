import { Request, Response } from 'express';
import { refillService } from '@services/refill.service';
import { ResponseUtil } from '@utils/response';
import { CONSTANTS } from '@config/constants';
import { asyncHandler } from '@utils/asyncHandler';
import { AuthRequest } from '@app-types/auth.types';
import { simplifiedPricingService } from '@services/pricing-simplified.service';
import { OperationType } from '@models/BusinessSetting.model';

export class RefillController {
  createRefill = asyncHandler(async (req: AuthRequest, res: Response) => {
    const operatorId = req.user!.id;
    const outletId = req.user!.outletId!;
    
    const refill = await refillService.createRefill(req.body, operatorId, outletId);
    
    return ResponseUtil.success(
      res,
      refill,
      CONSTANTS.SUCCESS_MESSAGES.RESOURCE_CREATED,
      CONSTANTS.HTTP_STATUS.CREATED
    );
  });

  bulkRefill = asyncHandler(async (req: AuthRequest, res: Response) => {
    const operatorId = req.user!.id;
    const outletId = req.user!.outletId!;
    
    const result = await refillService.bulkRefill(req.body, operatorId, outletId);
    
    return ResponseUtil.success(
      res,
      result,
      `${result.successful} refills completed successfully`
    );
  });

  getRefillById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const refill = await refillService.getRefillById(Number(id));
    
    return ResponseUtil.success(res, refill);
  });

  getCylinderRefills = asyncHandler(async (req: Request, res: Response) => {
    const { cylinderId } = req.params;
    const filters = {
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    
    const result = await refillService.getCylinderRefills(Number(cylinderId), filters);
    
    return ResponseUtil.success(res, result);
  });

  getOperatorRefills = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { operatorId } = req.params;
    const filters = {
      outletId: req.query.outletId ? Number(req.query.outletId) : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    
    // Operators can only see their own refills
    const targetOperatorId = req.user!.role === CONSTANTS.USER_ROLES.ADMIN || 
                           req.user!.role === CONSTANTS.USER_ROLES.STAFF
      ? Number(operatorId)
      : req.user!.id;
    
    const result = await refillService.getOperatorRefills(targetOperatorId, filters);
    
    return ResponseUtil.success(res, result);
  });

  getOutletRefills = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { outletId } = req.params;
    const filters = {
      operatorId: req.query.operatorId ? Number(req.query.operatorId) : undefined,
      cylinderId: req.query.cylinderId ? Number(req.query.cylinderId) : undefined,
      batchNumber: req.query.batchNumber as string | undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    
    // Staff can only see their outlet's refills
    const targetOutletId = req.user!.role === CONSTANTS.USER_ROLES.ADMIN 
      ? Number(outletId)
      : req.user!.outletId!;
    
    const result = await refillService.getOutletRefills(targetOutletId, filters);
    
    return ResponseUtil.success(res, result);
  });

  getRefillStatistics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = {
      outletId: req.query.outletId ? Number(req.query.outletId) : undefined,
      operatorId: req.query.operatorId ? Number(req.query.operatorId) : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    };
    
    // Staff can only see their outlet's statistics
    if (req.user!.role !== CONSTANTS.USER_ROLES.ADMIN && req.user!.outletId) {
      filters.outletId = req.user!.outletId;
    }
    
    const statistics = await refillService.getRefillStatistics(filters);
    
    return ResponseUtil.success(res, statistics);
  });

  getRefillQuote = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { cylinderType, gasAmount } = req.query;
    const outletId = req.user!.outletId;

    if (!gasAmount) {
      return ResponseUtil.badRequest(res, 'Gas amount is required');
    }

    // Get refill pricing quote
    const refillPricing = await simplifiedPricingService.calculatePrice({
      operationType: OperationType.REFILL,
      cylinderType: cylinderType as string,
      gasAmount: Number(gasAmount),
      outletId,
    });

    const quote = {
      // Amounts
      subtotal: refillPricing.subtotal,
      taxAmount: refillPricing.taxAmount,
      taxRate: refillPricing.taxRate,
      taxType: refillPricing.taxType,
      totalPrice: refillPricing.totalPrice,
      
      // Metadata
      gasAmount: Number(gasAmount),
      pricePerKg: refillPricing.basePrice,
      cylinderType: cylinderType || 'standard',
      
      // Breakdown
      breakdown: {
        pricePerKg: refillPricing.basePrice,
        gasAmount: Number(gasAmount),
        subtotal: refillPricing.subtotal,
        taxAmount: refillPricing.taxAmount,
        taxRate: refillPricing.taxRate,
        taxType: refillPricing.taxType,
        total: refillPricing.totalPrice,
      },
    };

    return ResponseUtil.success(res, quote, 'Refill pricing quote generated successfully');
  });
}

export const refillController = new RefillController();