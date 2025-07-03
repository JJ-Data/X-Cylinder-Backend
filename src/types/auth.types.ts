import { Request } from 'express';
import { BaseModelAttributes } from './common.types';

export interface RefreshTokenAttributes extends BaseModelAttributes {
  token: string;
  userId: number;
  expiresAt: Date;
  revoked: boolean;
}

export interface RefreshTokenCreationAttributes extends Omit<RefreshTokenAttributes, 'id' | 'createdAt' | 'updatedAt' | 'revoked'> {
  revoked?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  id: number;
  email: string;
  role: string;
  outletId?: number;
  paymentStatus?: string;
}

export interface TokenRefreshRequest {
  refreshToken: string;
}

export interface PasswordResetTokenAttributes extends BaseModelAttributes {
  userId: number;
  token: string;
  expiresAt: Date;
  used: boolean;
}

export interface PasswordResetTokenCreationAttributes extends Omit<PasswordResetTokenAttributes, 'id' | 'createdAt' | 'updatedAt' | 'used'> {
  used?: boolean;
}

export interface EmailVerificationTokenAttributes extends BaseModelAttributes {
  userId: number;
  token: string;
  expiresAt: Date;
  verified: boolean;
  verifiedAt?: Date;
}

export interface EmailVerificationTokenCreationAttributes extends Omit<EmailVerificationTokenAttributes, 'id' | 'createdAt' | 'updatedAt' | 'verified' | 'verifiedAt'> {
  verified?: boolean;
  verifiedAt?: Date;
}

export interface RegisterResponse {
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  tokens: AuthTokens;
  emailVerificationRequired: boolean;
}

export interface AuthRequest extends Request {
  user?: JwtPayload & { 
    model?: any; 
    emailVerified?: boolean;
    outletId?: number;
    paymentStatus?: string;
  };
}