import { BaseModelAttributes } from './common.types';

export interface OutletAttributes extends BaseModelAttributes {
  name: string;
  location: string;
  contactPhone: string;
  contactEmail: string;
  status: 'active' | 'inactive';
  managerId?: number;
}

export interface OutletCreationAttributes extends Omit<OutletAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export interface OutletUpdateAttributes extends Partial<Omit<OutletAttributes, 'id' | 'createdAt' | 'updatedAt'>> {}

export interface OutletPublicData {
  id: number;
  name: string;
  location: string;
  contactPhone: string;
  contactEmail: string;
  status: string;
  managerId?: number;
  createdAt: Date;
  updatedAt: Date;
}