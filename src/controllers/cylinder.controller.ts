import { Request, Response } from 'express';
import { cylinderService } from '@services/cylinder.service';
import { ResponseUtil } from '@utils/response';
import { CONSTANTS } from '@config/constants';
import { AppError } from '@utils/errors';
import { asyncHandler } from '@utils/asyncHandler';

export class CylinderController {
  createCylinder = asyncHandler(async (req: Request, res: Response) => {
    const cylinder = await cylinderService.createCylinder(req.body);

    return ResponseUtil.success(
      res,
      cylinder,
      CONSTANTS.SUCCESS_MESSAGES.RESOURCE_CREATED,
      CONSTANTS.HTTP_STATUS.CREATED
    );
  });

  updateCylinder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const cylinder = await cylinderService.updateCylinder(Number(id), req.body);

    return ResponseUtil.success(res, cylinder, CONSTANTS.SUCCESS_MESSAGES.RESOURCE_UPDATED);
  });

  getCylinderById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const cylinder = await cylinderService.getCylinderById(Number(id));

    return ResponseUtil.success(res, cylinder);
  });

  getCylinderByCode = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    if (!code) {
      throw new AppError('Cylinder code is required', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
    }
    const cylinder = await cylinderService.getCylinderByCode(code);

    return ResponseUtil.success(res, cylinder);
  });

  getCylinderByQRCode = asyncHandler(async (req: Request, res: Response) => {
    const { qrCode } = req.params;
    if (!qrCode) {
      throw new AppError('QR code is required', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
    }
    const cylinder = await cylinderService.getCylinderByQRCode(qrCode);

    return ResponseUtil.success(res, cylinder);
  });

  searchCylinders = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      outletId: req.query.outletId ? Number(req.query.outletId) : undefined,
      status: req.query.status as string | undefined,
      type: req.query.type as string | undefined,
      searchTerm: req.query.searchTerm as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await cylinderService.searchCylinders(filters);

    return ResponseUtil.success(res, result);
  });

  getAvailableCylinders = asyncHandler(async (req: Request, res: Response) => {
    const { outletId } = req.params;
    const { type } = req.query;

    const cylinders = await cylinderService.getAvailableCylinders(
      Number(outletId),
      type as string | undefined
    );

    return ResponseUtil.success(res, cylinders);
  });

  getCylinderHistory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const history = await cylinderService.getCylinderHistory(Number(id));

    return ResponseUtil.success(res, history);
  });

  retireCylinder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    await cylinderService.retireCylinder(Number(id), reason);

    return ResponseUtil.success(res, null, CONSTANTS.SUCCESS_MESSAGES.RESOURCE_UPDATED);
  });

  bulkCreateCylinders = asyncHandler(async (req: Request, res: Response) => {
    const { cylinders } = req.body;
    const count = await cylinderService.bulkCreateCylinders(cylinders);

    return ResponseUtil.success(
      res,
      { count },
      `${count} cylinders created successfully`,
      CONSTANTS.HTTP_STATUS.CREATED
    );
  });

  transferCylinder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { toOutletId, reason, notes } = req.body;

    const transferRecord = await cylinderService.transferCylinder(
      Number(id),
      toOutletId,
      req.user!.id,
      reason,
      notes
    );

    return ResponseUtil.success(
      res,
      transferRecord,
      'Cylinder transferred successfully'
    );
  });
}

export const cylinderController = new CylinderController();
