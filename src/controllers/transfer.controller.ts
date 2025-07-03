import { Request, Response } from 'express';
import transferService from '../services/transfer.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

class TransferController {
  getTransferHistory = asyncHandler(async (req: Request, res: Response) => {
    const {
      fromDate,
      toDate,
      fromOutletId,
      toOutletId,
      cylinderCode,
      status,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const filters = {
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      fromOutletId: fromOutletId ? Number(fromOutletId) : undefined,
      toOutletId: toOutletId ? Number(toOutletId) : undefined,
      cylinderCode: cylinderCode as string,
      status: status as string,
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC'
    };

    const result = await transferService.getTransferHistory(filters);

    return ResponseUtil.success(res, result, 'Transfer history fetched successfully');
  });

  getTransferById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const transfer = await transferService.getTransferById(Number(id));
    
    return ResponseUtil.success(res, transfer, 'Transfer details fetched successfully');
  });

  getTransferStatistics = asyncHandler(async (req: Request, res: Response) => {
    const { fromDate, toDate, outletId } = req.query;

    const filters = {
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      outletId: outletId ? Number(outletId) : undefined
    };

    const statistics = await transferService.getTransferStatistics(filters);

    return ResponseUtil.success(res, statistics, 'Transfer statistics fetched successfully');
  });

  exportTransfers = asyncHandler(async (req: Request, res: Response) => {
    const {
      fromDate,
      toDate,
      fromOutletId,
      toOutletId,
      cylinderCode,
      status,
      format = 'csv'
    } = req.query;

    const filters = {
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      fromOutletId: fromOutletId ? Number(fromOutletId) : undefined,
      toOutletId: toOutletId ? Number(toOutletId) : undefined,
      cylinderCode: cylinderCode as string,
      status: status as string
    };

    const exportResult = await transferService.exportTransfers(
      filters,
      format as 'csv' | 'excel'
    );

    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportResult.filename}"`
    );
    
    return res.send(exportResult.data);
  });

  acceptTransfer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user!.id;

    const transfer = await transferService.acceptTransfer(Number(id), userId, notes);

    return ResponseUtil.success(res, transfer, 'Transfer accepted successfully');
  });

  rejectTransfer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const userId = req.user!.id;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const transfer = await transferService.rejectTransfer(Number(id), userId, rejectionReason);

    return ResponseUtil.success(res, transfer, 'Transfer rejected successfully');
  });
}

export default new TransferController();