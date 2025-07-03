import { BaseModelAttributes } from './common.types';

// Enhanced TransferRecord interfaces with new approval workflow fields
export interface TransferRecordAttributes extends BaseModelAttributes {
  cylinderId: number;
  fromOutletId: number;
  toOutletId: number;
  transferredById: number; // Maps to initiated_by_id in DB
  initiatedById?: number; // Virtual field, same as transferredById
  acceptedById?: number;
  status: 'pending' | 'completed' | 'rejected';
  transferDate: Date;
  reason?: string;
  notes?: string;
  rejectionReason?: string;
  acceptedAt?: Date;
  rejectedAt?: Date;
}

export interface TransferRecordCreationAttributes extends Omit<TransferRecordAttributes, 'id' | 'createdAt' | 'updatedAt' | 'initiatedById' | 'status'> {
  status?: 'pending' | 'completed' | 'rejected'; // Optional with default
}

export interface TransferRecordPublicData {
  id: number;
  cylinderId: number;
  fromOutletId: number;
  toOutletId: number;
  transferredById: number;
  initiatedById: number; // Same as transferredById
  acceptedById?: number;
  status: 'pending' | 'completed' | 'rejected';
  transferDate: Date;
  reason?: string;
  notes?: string;
  rejectionReason?: string;
  acceptedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Alias Transfer types to TransferRecord for consistency
export type TransferAttributes = TransferRecordAttributes;
export type TransferCreationAttributes = TransferRecordCreationAttributes;
export type TransferPublicData = TransferRecordPublicData;

// For backward compatibility, export a simpler interface
export interface LegacyTransferRecordData {
  id: number;
  cylinderId: number;
  fromOutletId: number;
  toOutletId: number;
  transferredById: number;
  transferDate: Date;
  reason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransferDto {
  cylinderId: number;
  toOutletId: number;
  reason?: string;
  notes?: string;
}