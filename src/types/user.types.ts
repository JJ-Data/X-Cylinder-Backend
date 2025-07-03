import { BaseModelAttributes } from './common.types';

export interface UserAttributes extends BaseModelAttributes {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'customer' | 'staff' | 'refill_operator';
  isActive: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  lastLogin?: Date;
  outletId?: number;
  paymentStatus?: 'pending' | 'active' | 'inactive';
  activatedAt?: Date;
}

export interface UserCreationAttributes extends Omit<UserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'emailVerified' | 'isActive' | 'lastLogin'> {
  emailVerified?: boolean;
  isActive?: boolean;
}

export interface UserUpdateAttributes extends Partial<Omit<UserAttributes, 'id' | 'email' | 'password' | 'createdAt' | 'updatedAt'>> {
  password?: string;
}

export interface UserPublicData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}