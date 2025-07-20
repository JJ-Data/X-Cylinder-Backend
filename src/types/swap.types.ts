import { BaseModelAttributes } from './common.types';

export interface SwapRecordAttributes extends BaseModelAttributes {
  leaseId: number;
  oldCylinderId: number;
  newCylinderId: number;
  staffId: number;
  swapDate: Date;
  condition: 'good' | 'poor' | 'damaged';
  weightRecorded?: number;
  damageNotes?: string;
  swapFee: number;
  reasonForFee?: string;
  receiptPrinted: boolean;
  notes?: string;
}

export interface SwapRecordCreationAttributes extends Omit<SwapRecordAttributes, 'id' | 'createdAt' | 'updatedAt' | 'swapDate' | 'receiptPrinted'> {
  swapDate?: Date;
  receiptPrinted?: boolean;
}

export interface SwapRecordUpdateAttributes extends Partial<Pick<SwapRecordAttributes, 'condition' | 'weightRecorded' | 'damageNotes' | 'swapFee' | 'reasonForFee' | 'receiptPrinted' | 'notes'>> {}

export interface SwapRecordPublicData {
  id: number;
  leaseId: number;
  oldCylinderId: number;
  newCylinderId: number;
  staffId: number;
  swapDate: Date;
  condition: string;
  weightRecorded?: number;
  damageNotes?: string;
  swapFee: number;
  reasonForFee?: string;
  receiptPrinted: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Related data when included
  lease?: any;
  oldCylinder?: any;
  newCylinder?: any;
  staff?: any;
}

export interface CreateSwapDto {
  leaseId?: number;
  cylinderCode?: string;
  qrCode?: string;
  newCylinderId: number;
  condition: 'good' | 'poor' | 'damaged';
  weightRecorded?: number;
  damageNotes?: string;
  swapFee?: number;
  reasonForFee?: string;
  notes?: string;
}

export interface SwapFilters {
  leaseId?: number;
  customerId?: number;
  staffId?: number;
  oldCylinderId?: number;
  newCylinderId?: number;
  condition?: 'good' | 'poor' | 'damaged';
  dateFrom?: Date;
  dateTo?: Date;
  outletId?: number;
  page?: number;
  limit?: number;
  search?: string;
}

export interface SwapStatistics {
  totalSwaps: number;
  swapsByCondition: {
    good: number;
    poor: number;
    damaged: number;
  };
  totalFees: number;
  averageSwapFee: number;
  averageWeight: number;
  mostActiveStaff: {
    staffId: number;
    staffName: string;
    swapCount: number;
  };
  recentSwaps: SwapRecordPublicData[];
}

export interface SwapReceiptData {
  swap: SwapRecordPublicData;
  customer: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  outlet: {
    id: number;
    name: string;
    location: string;
    phone?: string;
  };
  oldCylinder: {
    id: number;
    cylinderCode: string;
    type: string;
    currentGasVolume: number;
  };
  newCylinder: {
    id: number;
    cylinderCode: string;
    type: string;
    currentGasVolume: number;
    maxGasVolume: number;
  };
}