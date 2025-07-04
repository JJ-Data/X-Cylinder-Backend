import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@services/auth.service';
import { ResponseUtil } from '@utils/response';
import { CONSTANTS } from '@config/constants';
import {
  LoginRequest,
  RegisterRequest,
  TokenRefreshRequest,
} from '@app-types/auth.types';
import { UnauthorizedError } from '@utils/errors';
import { User } from '@models/User.model';

export class AuthController {
  public static async register(
    req: Request<{}, {}, RegisterRequest>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tokens, user } = await AuthService.register(req.body);

      // Return user info and tokens in response body
      ResponseUtil.created(res, { user, tokens }, CONSTANTS.SUCCESS_MESSAGES.REGISTER_SUCCESS);
    } catch (error) {
      next(error);
    }
  }

  public static async login(
    req: Request<{}, {}, LoginRequest>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tokens, user } = await AuthService.login(req.body);

      // Return user info and tokens in response body
      ResponseUtil.success(res, { user, tokens }, CONSTANTS.SUCCESS_MESSAGES.LOGIN_SUCCESS);
    } catch (error) {
      next(error);
    }
  }

  public static async refreshToken(
    req: Request<{}, {}, TokenRefreshRequest>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Get refresh token from body or Authorization header
      let refreshToken = req.body.refreshToken;
      
      // Check Authorization header for Bearer token
      const authHeader = req.headers.authorization;
      if (!refreshToken && authHeader && authHeader.startsWith('Bearer ')) {
        refreshToken = authHeader.substring(7);
      }

      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token not provided');
      }

      const { tokens, user } = await AuthService.refreshTokens(refreshToken);

      // Return new tokens in response body
      ResponseUtil.success(res, { user, tokens }, 'Tokens refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async logout(
    req: Request<{}, {}, TokenRefreshRequest>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Get refresh token from body or Authorization header
      let refreshToken = req.body.refreshToken;
      
      // Check Authorization header for Bearer token
      const authHeader = req.headers.authorization;
      if (!refreshToken && authHeader && authHeader.startsWith('Bearer ')) {
        refreshToken = authHeader.substring(7);
      }

      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      ResponseUtil.success(res, null, CONSTANTS.SUCCESS_MESSAGES.LOGOUT_SUCCESS);
    } catch (error) {
      next(error);
    }
  }

  public static async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.unauthorized(res);
        return;
      }

      await AuthService.logoutAll(req.user.id);

      ResponseUtil.success(res, null, 'Logged out from all devices');
    } catch (error) {
      next(error);
    }
  }

  public static async forgotPassword(
    req: Request<{}, {}, { email: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.forgotPassword(req.body.email);

      ResponseUtil.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  public static async resetPassword(
    req: Request<{}, {}, { token: string; password: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.resetPassword(req.body.token, req.body.password);

      ResponseUtil.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  public static async validateResetToken(
    req: Request<{ token: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.validateResetToken(req.params.token);

      if (!result.valid) {
        ResponseUtil.badRequest(res, result.error || 'Invalid token');
        return;
      }

      ResponseUtil.success(res, { valid: true, user: result.user }, 'Token is valid');
    } catch (error) {
      next(error);
    }
  }

  public static async verifyEmail(
    req: Request<{ token: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.verifyEmail(req.params.token);

      ResponseUtil.success(res, result.user, result.message);
    } catch (error) {
      next(error);
    }
  }

  public static async resendVerificationEmail(
    req: Request<{}, {}, { email: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.resendVerificationEmail(req.body.email);

      ResponseUtil.success(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  public static async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }

      // Get fresh user data from database
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive');
      }

      ResponseUtil.success(res, user.toPublicJSON(), 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

}
