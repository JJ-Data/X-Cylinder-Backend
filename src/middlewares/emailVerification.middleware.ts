import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '@utils/response';
import { CONSTANTS } from '@config/constants';

/**
 * Middleware to ensure that the authenticated user has a verified email address.
 * This should be used on routes that require email verification.
 * 
 * Note: This middleware must be used AFTER the authenticate middleware,
 * as it expects req.user to be populated.
 */
export const requireVerifiedEmail = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      ResponseUtil.unauthorized(res, CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED);
      return;
    }

    // Check if email is verified
    if (!req.user.emailVerified) {
      ResponseUtil.forbidden(res, 'Email verification required. Please verify your email address to access this resource.');
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if the user's email is verified but doesn't block the request.
 * Instead, it adds a flag to the request object.
 * 
 * This is useful for routes where you want to provide different functionality
 * based on email verification status.
 */
export const checkEmailVerification = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    if (req.user) {
      req.emailVerified = req.user.emailVerified || false;
    } else {
      req.emailVerified = false;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Extend the Express Request interface to include emailVerified property
declare global {
  namespace Express {
    interface Request {
      emailVerified?: boolean;
    }
  }
}