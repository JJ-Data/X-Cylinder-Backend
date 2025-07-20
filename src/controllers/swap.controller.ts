import { Request, Response } from 'express';
import { swapService } from '@services/swap.service';
import { ResponseUtil } from '@utils/response';
import { CONSTANTS } from '@config/constants';
import { asyncHandler } from '@utils/asyncHandler';
import { AuthRequest } from '@app-types/auth.types';

export class SwapController {
  getSwaps = asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = {
      leaseId: req.query.leaseId ? Number(req.query.leaseId) : undefined,
      customerId: req.query.customerId ? Number(req.query.customerId) : undefined,
      staffId: req.query.staffId ? Number(req.query.staffId) : undefined,
      oldCylinderId: req.query.oldCylinderId ? Number(req.query.oldCylinderId) : undefined,
      newCylinderId: req.query.newCylinderId ? Number(req.query.newCylinderId) : undefined,
      condition: req.query.condition as 'good' | 'poor' | 'damaged' | undefined,
      outletId: req.query.outletId ? Number(req.query.outletId) : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      search: req.query.search as string | undefined,
    };

    const result = await swapService.getSwaps(filters);
    
    return ResponseUtil.success(res, result);
  });

  createSwap = asyncHandler(async (req: AuthRequest, res: Response) => {
    const staffId = req.user!.id;
    
    const swap = await swapService.createSwap(req.body, staffId);
    
    return ResponseUtil.success(
      res,
      swap,
      'Cylinder swap completed successfully',
      CONSTANTS.HTTP_STATUS.CREATED
    );
  });

  getSwapById = asyncHandler(async (req: Request, res: Response) => {
    const swapId = Number(req.params.id);
    
    const swap = await swapService.getSwapById(swapId);
    
    return ResponseUtil.success(res, swap);
  });

  getSwapsByCustomer = asyncHandler(async (req: Request, res: Response) => {
    const customerId = Number(req.params.customerId);
    const filters = {
      condition: req.query.condition as 'good' | 'poor' | 'damaged' | undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    };

    const result = await swapService.getSwapsByCustomer(customerId, filters);
    
    return ResponseUtil.success(res, result);
  });

  getSwapStatistics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const outletId = req.query.outletId ? Number(req.query.outletId) : undefined;
    
    const statistics = await swapService.getSwapStatistics(outletId);
    
    return ResponseUtil.success(res, statistics);
  });

  getSwapReceiptData = asyncHandler(async (req: Request, res: Response) => {
    const swapId = Number(req.params.id);
    
    const receiptData = await swapService.getSwapReceiptData(swapId);
    
    return ResponseUtil.success(res, receiptData);
  });

  markReceiptPrinted = asyncHandler(async (req: Request, res: Response) => {
    const swapId = Number(req.params.id);
    
    await swapService.markReceiptPrinted(swapId);
    
    return ResponseUtil.success(res, { message: 'Receipt marked as printed' });
  });

  getOutletSwaps = asyncHandler(async (req: AuthRequest, res: Response) => {
    const outletId = req.user?.outletId || Number(req.params.outletId);
    
    const filters = {
      outletId,
      customerId: req.query.customerId ? Number(req.query.customerId) : undefined,
      staffId: req.query.staffId ? Number(req.query.staffId) : undefined,
      condition: req.query.condition as 'good' | 'poor' | 'damaged' | undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    };

    const result = await swapService.getSwaps(filters);
    
    return ResponseUtil.success(res, result);
  });

  findCylinder = asyncHandler(async (req: Request, res: Response) => {
    const identifier = {
      leaseId: req.query.leaseId ? Number(req.query.leaseId) : undefined,
      cylinderCode: req.query.cylinderCode as string | undefined,
      qrCode: req.query.qrCode as string | undefined,
    };

    const result = await swapService.findCylinder(identifier);
    
    return ResponseUtil.success(res, result);
  });

  getAvailableCylinders = asyncHandler(async (req: Request, res: Response) => {
    const type = req.query.type as string | undefined;

    const result = await swapService.getAvailableCylinders(type);
    
    return ResponseUtil.success(res, result);
  });
}

export const swapController = new SwapController();