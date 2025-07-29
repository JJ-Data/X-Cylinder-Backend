import { BaseModelAttributes } from './common.types';

export interface RefillRecordAttributes extends BaseModelAttributes {
  cylinderId: number;
  operatorId: number;
  outletId: number;
  refillDate: Date;
  preRefillVolume: number;
  postRefillVolume: number;
  volumeAdded: number;
  refillCost?: number;
  notes?: string;
  batchNumber?: string;
}

export interface RefillRecordCreationAttributes extends Omit<RefillRecordAttributes, 'id' | 'createdAt' | 'updatedAt' | 'volumeAdded'> {}

export interface RefillRecordPublicData {
  id: number;
  cylinderId: number;
  operatorId: number;
  outletId: number;
  refillDate: Date;
  preRefillVolume: number;
  postRefillVolume: number;
  volumeAdded: number;
  refillCost?: number;
  notes?: string;
  batchNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  // Associated models
  cylinder?: {
    id: number;
    cylinderCode: string;
    type: string;
    qrCode: string;
  };
  operator?: {
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

export interface CreateRefillDto {
  cylinderId: number;
  preRefillVolume: number;
  postRefillVolume: number;
  refillCost?: number;
  notes?: string;
  batchNumber?: string;
}

export interface BulkRefillDto {
  batchNumber: string;
  refills: Array<{
    cylinderCode: string;
    preRefillVolume: number;
    postRefillVolume: number;
    refillCost?: number;
  }>;
  notes?: string;
}