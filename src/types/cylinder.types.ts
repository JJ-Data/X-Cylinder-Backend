import { BaseModelAttributes } from './common.types';

export interface CylinderAttributes extends BaseModelAttributes {
  cylinderCode: string;
  type: '5kg' | '10kg' | '15kg' | '50kg';
  status: 'available' | 'leased' | 'refilling' | 'damaged' | 'retired';
  currentOutletId: number;
  qrCode: string;
  manufactureDate?: Date;
  lastInspectionDate?: Date;
  currentGasVolume: number;
  maxGasVolume: number;
  notes?: string;
}

export interface CylinderCreationAttributes extends Omit<CylinderAttributes, 'id' | 'createdAt' | 'updatedAt' | 'currentGasVolume'> {
  currentGasVolume?: number;
}

export interface CylinderUpdateAttributes extends Partial<Omit<CylinderAttributes, 'id' | 'createdAt' | 'updatedAt' | 'cylinderCode' | 'qrCode'>> {}

export interface CylinderPublicData {
  id: number;
  cylinderCode: string;
  type: string;
  status: string;
  currentOutletId: number;
  qrCode: string;
  manufactureDate?: Date;
  lastInspectionDate?: Date;
  currentGasVolume: number;
  maxGasVolume: number;
  createdAt: Date;
  updatedAt: Date;
}