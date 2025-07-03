import { Request, Response } from 'express';
import { outletService } from '@services/outlet.service';
import { ResponseUtil } from '@utils/response';
import { CONSTANTS } from '@config/constants';
import { asyncHandler } from '@utils/asyncHandler';

export class OutletController {
  createOutlet = asyncHandler(async (req: Request, res: Response) => {
    const outlet = await outletService.createOutlet(req.body);
    
    return ResponseUtil.success(
      res,
      outlet,
      CONSTANTS.SUCCESS_MESSAGES.RESOURCE_CREATED,
      CONSTANTS.HTTP_STATUS.CREATED
    );
  });

  updateOutlet = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const outlet = await outletService.updateOutlet(Number(id), req.body);
    
    return ResponseUtil.success(
      res,
      outlet,
      CONSTANTS.SUCCESS_MESSAGES.RESOURCE_UPDATED
    );
  });

  getOutletById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const outlet = await outletService.getOutletById(Number(id));
    
    return ResponseUtil.success(res, outlet);
  });

  getAllOutlets = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      status: req.query.status as 'active' | 'inactive' | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    
    const result = await outletService.getAllOutlets(filters);
    
    return ResponseUtil.success(res, result);
  });

  getOutletInventory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const inventory = await outletService.getOutletInventory(Number(id));
    
    return ResponseUtil.success(res, inventory);
  });

  deactivateOutlet = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await outletService.deactivateOutlet(Number(id));
    
    return ResponseUtil.success(
      res,
      null,
      CONSTANTS.SUCCESS_MESSAGES.RESOURCE_UPDATED
    );
  });
}

export const outletController = new OutletController();