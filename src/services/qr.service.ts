import QRCode from 'qrcode';
import { AppError } from '@utils/errors';
import { CONSTANTS } from '@config/constants';
import { fileService } from './file.service';
import sharp from 'sharp';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface CylinderQRData {
  cylinderId: number;
  cylinderCode: string;
  type: string;
  outletId: number;
  qrCode: string;
}

export class QRService {
  private defaultOptions: QRCodeOptions = {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  };

  /**
   * Generate QR code as data URL
   */
  async generateQRDataURL(data: string, options?: QRCodeOptions): Promise<string> {
    try {
      const qrOptions = { ...this.defaultOptions, ...options };
      return await QRCode.toDataURL(data, qrOptions);
    } catch (error) {
      throw new AppError('Failed to generate QR code data URL', CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Generate QR code as Buffer (for image generation)
   */
  async generateQRBuffer(data: string, options?: QRCodeOptions): Promise<Buffer> {
    try {
      const qrOptions = { ...this.defaultOptions, ...options };
      return await QRCode.toBuffer(data, qrOptions);
    } catch (error) {
      throw new AppError('Failed to generate QR code buffer', CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Generate QR code as SVG
   */
  async generateQRSVG(data: string, options?: QRCodeOptions): Promise<string> {
    try {
      const qrOptions = { ...this.defaultOptions, ...options };
      return await QRCode.toString(data, { ...qrOptions, type: 'svg' });
    } catch (error) {
      throw new AppError('Failed to generate QR code SVG', CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Generate QR code for cylinder with embedded data
   */
  async generateCylinderQR(cylinderData: CylinderQRData, options?: QRCodeOptions): Promise<{
    dataURL: string;
    qrData: string;
  }> {
    const qrData = JSON.stringify({
      id: cylinderData.cylinderId,
      code: cylinderData.cylinderCode,
      type: cylinderData.type,
      outlet: cylinderData.outletId,
      qr: cylinderData.qrCode,
      v: 1, // Version for future compatibility
    });

    const dataURL = await this.generateQRDataURL(qrData, options);

    return {
      dataURL,
      qrData,
    };
  }

  /**
   * Generate QR code with logo/branding
   */
  async generateBrandedQR(data: string, logoPath?: string, options?: QRCodeOptions): Promise<Buffer> {
    const qrBuffer = await this.generateQRBuffer(data, {
      ...options,
      width: options?.width || 400,
    });

    if (!logoPath) {
      return qrBuffer;
    }

    try {
      // Add logo to center of QR code
      const qrImage = sharp(qrBuffer);
      const metadata = await qrImage.metadata();
      const qrWidth = metadata.width || 400;
      const logoSize = Math.floor(qrWidth * 0.2); // Logo takes 20% of QR code

      const logo = await sharp(logoPath)
        .resize(logoSize, logoSize)
        .toBuffer();

      const compositeImage = await sharp(qrBuffer)
        .composite([
          {
            input: logo,
            top: Math.floor((qrWidth - logoSize) / 2),
            left: Math.floor((qrWidth - logoSize) / 2),
          },
        ])
        .toBuffer();

      return compositeImage;
    } catch (error) {
      // If logo processing fails, return plain QR code
      console.error('Failed to add logo to QR code:', error);
      return qrBuffer;
    }
  }

  /**
   * Validate QR code data format
   */
  validateCylinderQRData(qrData: string): CylinderQRData | null {
    try {
      const parsed = JSON.parse(qrData);
      
      if (
        typeof parsed.id === 'number' &&
        typeof parsed.code === 'string' &&
        typeof parsed.type === 'string' &&
        typeof parsed.outlet === 'number' &&
        typeof parsed.qr === 'string'
      ) {
        return {
          cylinderId: parsed.id,
          cylinderCode: parsed.code,
          type: parsed.type,
          outletId: parsed.outlet,
          qrCode: parsed.qr,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate bulk QR codes for multiple cylinders
   */
  async generateBulkQRCodes(cylinders: CylinderQRData[], options?: QRCodeOptions): Promise<Map<number, {
    dataURL: string;
    qrData: string;
  }>> {
    const results = new Map();

    await Promise.all(
      cylinders.map(async (cylinder) => {
        try {
          const qrResult = await this.generateCylinderQR(cylinder, options);
          results.set(cylinder.cylinderId, qrResult);
        } catch (error) {
          console.error(`Failed to generate QR for cylinder ${cylinder.cylinderId}:`, error);
        }
      })
    );

    return results;
  }

  /**
   * Save QR code to file storage
   */
  async saveQRCode(
    cylinderId: number,
    qrBuffer: Buffer,
    format: 'png' | 'svg' = 'png'
  ): Promise<string> {
    const fileName = `qr-codes/cylinder-${cylinderId}.${format}`;
    const mimeType = format === 'svg' ? 'image/svg+xml' : 'image/png';

    const uploadResult = await fileService.uploadFile(
      qrBuffer,
      fileName,
      mimeType
    );

    return uploadResult.url;
  }

  /**
   * Generate QR code URL for scanning
   */
  generateScanURL(cylinderId: number, baseURL: string): string {
    return `${baseURL}/scan/cylinder/${cylinderId}`;
  }
}

export const qrService = new QRService();