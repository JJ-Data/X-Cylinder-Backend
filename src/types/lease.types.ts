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
  lateFees?: number;
  lastNotificationSent?: Date;
  notificationCount?: number;
  lastOverdueCheck?: Date;
}

export interface LeaseRecordCreationAttributes extends Omit<LeaseRecordAttributes, 'id' | 'createdAt' | 'updatedAt' | 'actualReturnDate' | 'returnStaffId' | 'refundAmount' | 'lateFees' | 'lastNotificationSent' | 'lastOverdueCheck'> {}

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
  lateFees?: number;
  lastNotificationSent?: Date;
  notificationCount?: number;
  lastOverdueCheck?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Associated models
  customer?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
  cylinder?: {
    id: number;
    cylinderCode: string;
    type: string;
    qrCode: string;
  };
  staff?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
  returnStaff?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
  outlet?: {
    id: number;
    name: string;
    location: string;
  };
}

export interface CreateLeaseDto {
  cylinderId?: number;
  cylinderCode?: string;
  qrCode?: string;
  customerId: number;
  expectedReturnDate?: Date;
  depositAmount?: number; // Optional - will be calculated if not provided
  leaseAmount?: number; // Optional - will be calculated if not provided
  duration?: number; // Duration in days for pricing calculation
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