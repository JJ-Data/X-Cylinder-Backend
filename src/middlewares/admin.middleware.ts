import { Request, Response, NextFunction } from 'express';
import { AppError } from '@utils/errors';

/**
 * Middleware to check if user has admin privileges
 * Must be used after authMiddleware to ensure req.user is populated
 */
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      throw new AppError('Admin privileges required', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};