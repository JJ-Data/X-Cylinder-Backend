import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '@utils/errors';
import { CONSTANTS } from '@config/constants';

/**
 * Middleware to enforce outlet-based access control
 * Ensures staff and operators can only access data from their assigned outlet
 */
export const enforceOutletAccess = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }

  const userRole = req.user.role;
  const userOutletId = req.user.outletId;

  // Admins have access to all outlets
  if (userRole === CONSTANTS.USER_ROLES.ADMIN) {
    return next();
  }

  // Staff and operators must have an assigned outlet
  if (
    (userRole === CONSTANTS.USER_ROLES.STAFF || userRole === CONSTANTS.USER_ROLES.REFILL_OPERATOR) &&
    !userOutletId
  ) {
    return next(new ForbiddenError('No outlet assigned to user'));
  }

  // Add outlet context to request for filtering
  req.outletContext = {
    userOutletId,
    canAccessAllOutlets: userRole === CONSTANTS.USER_ROLES.ADMIN,
  };

  next();
};

/**
 * Middleware to validate outlet parameter against user's outlet access
 */
export const validateOutletParam = (paramName: string = 'outletId') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const paramValue = req.params[paramName];
    if (!paramValue) {
      return next(new ForbiddenError('Missing outlet parameter'));
    }
    const requestedOutletId = parseInt(paramValue);
    const userRole = req.user?.role;
    const userOutletId = req.user?.outletId;

    // Admins can access any outlet
    if (userRole === CONSTANTS.USER_ROLES.ADMIN) {
      return next();
    }

    // Staff and operators can only access their assigned outlet
    if (
      (userRole === CONSTANTS.USER_ROLES.STAFF || userRole === CONSTANTS.USER_ROLES.REFILL_OPERATOR) &&
      userOutletId !== requestedOutletId
    ) {
      return next(new ForbiddenError('Access denied: Cannot access data from other outlets'));
    }

    next();
  };
};

/**
 * Middleware to add outlet filtering to query parameters
 */
export const addOutletFilter = (req: Request, _res: Response, next: NextFunction): void => {
  const userRole = req.user?.role;
  const userOutletId = req.user?.outletId;

  // For staff and operators, automatically filter by their outlet
  if (
    (userRole === CONSTANTS.USER_ROLES.STAFF || userRole === CONSTANTS.USER_ROLES.REFILL_OPERATOR) &&
    userOutletId
  ) {
    // Add outletId to query params if not already present
    if (!req.query.outletId) {
      req.query.outletId = userOutletId.toString();
    }
    
    // Ensure they can't override with a different outlet
    if (req.query.outletId && parseInt(req.query.outletId as string) !== userOutletId) {
      req.query.outletId = userOutletId.toString();
    }
  }

  next();
};

// Extend Express Request interface to include outlet context
declare global {
  namespace Express {
    interface Request {
      outletContext?: {
        userOutletId?: number;
        canAccessAllOutlets: boolean;
      };
    }
  }
}