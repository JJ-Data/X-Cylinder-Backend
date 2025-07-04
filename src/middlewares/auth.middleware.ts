import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '@utils/errors';
import { verifyJWT } from '@utils/helpers';
import { User } from '@models/User.model';
import { JwtPayload } from '@app-types/auth.types';
import { UserRole } from '@config/constants';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { model?: any; emailVerified?: boolean };
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for token in authorization header first, then cookie (for backward compatibility)
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.accessToken;

    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const payload = verifyJWT(token);

    // Verify user still exists and is active
    const user = await User.findByPk(payload.id, {
      attributes: ['id', 'email', 'role', 'isActive', 'emailVerified', 'outletId', 'paymentStatus'],
    });

    if (!user || !user.getDataValue('isActive')) {
      throw new UnauthorizedError('User not found or inactive');
    }

    req.user = {
      ...payload,
      model: user,
      emailVerified: user.getDataValue('emailVerified'),
      outletId: user.getDataValue('outletId'),
      paymentStatus: user.getDataValue('paymentStatus'),
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for token in authorization header first, then cookie (for backward compatibility)
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.accessToken;

    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      return next();
    }

    const payload = verifyJWT(token);

    const user = await User.findByPk(payload.id, {
      attributes: ['id', 'email', 'role', 'isActive', 'emailVerified', 'outletId', 'paymentStatus'],
    });

    if (user && user.getDataValue('isActive')) {
      req.user = {
        ...payload,
        model: user,
        emailVerified: user.getDataValue('emailVerified'),
        outletId: user.getDataValue('outletId'),
        paymentStatus: user.getDataValue('paymentStatus'),
      };
    }

    next();
  } catch (error) {
    // Ignore errors and continue without authentication
    next();
  }
};
