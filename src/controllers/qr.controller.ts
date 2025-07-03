import { Request, Response } from 'express';
import { cylinderService } from '@services/cylinder.service';
import { qrService } from '@services/qr.service';
import { ResponseUtil } from '@utils/response';
import { CONSTANTS } from '@config/constants';
import { asyncHandler } from '@utils/asyncHandler';

export class QRController {
  getCylinderQRCode = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const qrData = await cylinderService.getCylinderQRCode(Number(id));
    
    return ResponseUtil.success(res, qrData);
  });

  downloadCylinderQRCode = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { format = 'png' } = req.query;
    
    const cylinder = await cylinderService.getCylinderById(Number(id));
    
    const qrData = await qrService.generateCylinderQR({
      cylinderId: cylinder.id,
      cylinderCode: cylinder.cylinderCode,
      type: cylinder.type,
      outletId: cylinder.currentOutletId,
      qrCode: cylinder.qrCode,
    });

    if (format === 'svg') {
      const svg = await qrService.generateQRSVG(qrData.qrData);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `attachment; filename="cylinder-${id}-qr.svg"`);
      return res.send(svg);
    } else {
      const buffer = await qrService.generateQRBuffer(qrData.qrData);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="cylinder-${id}-qr.png"`);
      return res.send(buffer);
    }
  });

  generateBulkQRCodes = asyncHandler(async (req: Request, res: Response) => {
    const { cylinderIds } = req.body;
    const results = await cylinderService.generateBulkQRCodes(cylinderIds);
    
    return ResponseUtil.success(
      res,
      results,
      `Generated ${results.success.length} QR codes successfully`
    );
  });

  validateQRCode = asyncHandler(async (req: Request, res: Response) => {
    const { qrData } = req.body;
    
    const validatedData = qrService.validateCylinderQRData(qrData);
    
    if (!validatedData) {
      return ResponseUtil.error(
        res,
        'Invalid QR code format',
        CONSTANTS.HTTP_STATUS.BAD_REQUEST
      );
    }

    // Get full cylinder data
    try {
      const cylinder = await cylinderService.getCylinderById(validatedData.cylinderId);
      
      return ResponseUtil.success(res, {
        valid: true,
        cylinderData: cylinder,
        qrData: validatedData,
      });
    } catch (error) {
      return ResponseUtil.success(res, {
        valid: true,
        cylinderData: null,
        qrData: validatedData,
        message: 'QR code is valid but cylinder not found in system',
      });
    }
  });
}

export const qrController = new QRController();