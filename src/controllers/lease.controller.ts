import { Request, Response } from 'express';
import { leaseService } from '@services/lease.service';
import { ResponseUtil } from '@utils/response';
import { CONSTANTS } from '@config/constants';
import { asyncHandler } from '@utils/asyncHandler';
import { AuthRequest } from '@app-types/auth.types';
import { pricingService } from '@services/pricing.service';
import { OperationType } from '@models/BusinessSetting.model';

export class LeaseController {
  getLeases = asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = {
      cylinderId: req.query.cylinderId ? Number(req.query.cylinderId) : undefined,
      customerId: req.query.customerId ? Number(req.query.customerId) : undefined,
      outletId: req.query.outletId ? Number(req.query.outletId) : undefined,
      status: req.query.status as string | undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    };

    const result = await leaseService.getLeases(filters);
    
    return ResponseUtil.success(res, result);
  });

  createLease = asyncHandler(async (req: AuthRequest, res: Response) => {
    const staffId = req.user!.id;
    const outletId = req.user!.outletId!;
    
    const lease = await leaseService.createLease(req.body, staffId, outletId);
    
    return ResponseUtil.success(
      res,
      lease,
      CONSTANTS.SUCCESS_MESSAGES.RESOURCE_CREATED,
      CONSTANTS.HTTP_STATUS.CREATED
    );
  });

  returnCylinder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const returnStaffId = req.user!.id;
    
    const lease = await leaseService.returnCylinder(req.body, returnStaffId);
    
    return ResponseUtil.success(
      res,
      lease,
      CONSTANTS.SUCCESS_MESSAGES.RESOURCE_UPDATED
    );
  });

  getLeaseById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const lease = await leaseService.getLeaseById(Number(id));
    
    return ResponseUtil.success(res, lease);
  });

  getCustomerLeases = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { customerId } = req.params;
    const filters = {
      status: req.query.status as 'active' | 'returned' | 'overdue' | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    
    // If user is a customer, they can only see their own leases
    const targetCustomerId = req.user!.role === CONSTANTS.USER_ROLES.CUSTOMER 
      ? req.user!.id 
      : Number(customerId);
    
    const result = await leaseService.getCustomerLeases(targetCustomerId, filters);
    
    return ResponseUtil.success(res, result);
  });

  getOutletLeases = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { outletId } = req.params;
    const filters = {
      status: req.query.status as 'active' | 'returned' | 'overdue' | undefined,
      customerId: req.query.customerId ? Number(req.query.customerId) : undefined,
      cylinderId: req.query.cylinderId ? Number(req.query.cylinderId) : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    
    // Staff can only see their outlet's leases
    const targetOutletId = req.user!.role === CONSTANTS.USER_ROLES.ADMIN 
      ? Number(outletId)
      : req.user!.outletId!;
    
    const result = await leaseService.getOutletLeases(targetOutletId, filters);
    
    return ResponseUtil.success(res, result);
  });

  getActiveLeasesByCylinder = asyncHandler(async (req: Request, res: Response) => {
    const { cylinderId } = req.params;
    const lease = await leaseService.getActiveLeasesByCylinder(Number(cylinderId));
    
    return ResponseUtil.success(res, lease);
  });

  updateOverdueLeases = asyncHandler(async (req: Request, res: Response) => {
    const count = await leaseService.updateOverdueLeases();
    
    return ResponseUtil.success(
      res,
      { count },
      `${count} leases marked as overdue`
    );
  });

  getLeaseStatistics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { outletId } = req.query;
    
    // Staff can only see their outlet's statistics
    const targetOutletId = req.user!.role === CONSTANTS.USER_ROLES.ADMIN 
      ? (outletId ? Number(outletId) : undefined)
      : req.user!.outletId;
    
    const statistics = await leaseService.getLeaseStatistics(targetOutletId);
    
    return ResponseUtil.success(res, statistics);
  });

  getPricingQuote = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { cylinderType, customerTier, duration } = req.query;
    const outletId = req.user!.outletId!;

    if (!cylinderType) {
      return ResponseUtil.badRequest(res, 'Cylinder type is required');
    }

    const durationDays = duration ? Number(duration) : 30; // Default 30 days

    // Get lease pricing quote
    const leasePricing = await pricingService.calculatePrice({
      operationType: OperationType.LEASE,
      cylinderType: cylinderType as string,
      quantity: 1,
      customerTier: customerTier as 'regular' | 'business' | 'premium' || 'regular',
      outletId,
      duration: durationDays,
    });

    // Get deposit pricing quote (using GENERAL for now)
    const depositPricing = await pricingService.calculatePrice({
      operationType: OperationType.GENERAL,
      cylinderType: cylinderType as string,
      quantity: 1,
      outletId,
    });

    const quote = {
      leaseAmount: leasePricing.totalPrice,
      depositAmount: depositPricing.totalPrice,
      duration: durationDays,
      cylinderType,
      customerTier: customerTier || 'regular',
      breakdown: {
        lease: leasePricing.breakdown,
        deposit: depositPricing.breakdown,
      },
      appliedRules: {
        lease: leasePricing.appliedRules,
        deposit: depositPricing.appliedRules,
      },
    };

    return ResponseUtil.success(res, quote, 'Pricing quote generated successfully');
  });
}

export const leaseController = new LeaseController();