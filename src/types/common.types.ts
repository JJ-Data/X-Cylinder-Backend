import { Request } from 'express';

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface BaseModelAttributes {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RequestWithUser extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}
