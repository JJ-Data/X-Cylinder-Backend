import { BaseModelAttributes } from './common.types';

export interface LeaseRecordAttributes extends BaseModelAttributes {
  cylinderId: number;
  customerId: number;
  outletId: number;
  staffId: number;
  leaseDate: Date;
  expectedReturnDate?: Date;
  actualReturnDate?: Date;
  returnStaffId?: number;
  leaseStatus: 'active' | 'returned' | 'overdue';
  depositAmount: number;
  leaseAmount: number;
  refundAmount?: number;
  notes?: string;
}

export interface LeaseRecordCreationAttributes extends Omit<LeaseRecordAttributes, 'id' | 'createdAt' | 'updatedAt' | 'actualReturnDate' | 'returnStaffId' | 'refundAmount'> {}

export interface LeaseRecordUpdateAttributes extends Partial<Pick<LeaseRecordAttributes, 'expectedReturnDate' | 'actualReturnDate' | 'returnStaffId' | 'leaseStatus' | 'refundAmount' | 'notes'>> {}

export interface LeaseRecordPublicData {
  id: number;
  cylinderId: number;
  customerId: number;
  outletId: number;
  staffId: number;
  leaseDate: Date;
  expectedReturnDate?: Date;
  actualReturnDate?: Date;
  returnStaffId?: number;
  leaseStatus: string;
  depositAmount: number;
  leaseAmount: number;
  refundAmount?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaseDto {
  cylinderId?: number;
  cylinderCode?: string;
  qrCode?: string;
  customerId: number;
  expectedReturnDate?: Date;
  depositAmount: number;
  leaseAmount: number;
  notes?: string;
}

export interface ReturnCylinderDto {
  leaseId: number;
  refundAmount: number;
  condition?: 'good' | 'damaged' | 'needs_inspection';
  gasRemaining?: number;
  damageNotes?: string;
  notes?: string;
}