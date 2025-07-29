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
      // Extract login metadata from request
      const loginMetadata = {
        ipAddress: AuthController.getClientIP(req),
        userAgent: req.headers['user-agent'],
        deviceInfo: AuthController.extractDeviceInfo(req.headers['user-agent']),
        browserInfo: AuthController.extractBrowserInfo(req.headers['user-agent']),
        location: req.headers['cf-ipcountry'] as string || 
                 req.headers['x-forwarded-for-country'] as string || 
                 undefined,
      };

      const { tokens, user } = await AuthService.login(req.body, loginMetadata);

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

  // Helper methods for extracting login metadata
  private static getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const real = req.headers['x-real-ip'] as string;
    const cfConnecting = req.headers['cf-connecting-ip'] as string;
    
    return cfConnecting || 
           real || 
           (forwarded ? forwarded.split(',')[0]?.trim() : '') || 
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           (req.connection as any)?.socket?.remoteAddress ||
           'unknown';
  }

  private static extractDeviceInfo(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;

    // Simple device detection patterns
    const mobilePattern = /Mobile|Android|iPhone|iPad/i;
    const tabletPattern = /iPad|Tablet/i;
    const desktopPattern = /Windows|Macintosh|Linux/i;

    if (tabletPattern.test(userAgent)) {
      return 'Tablet';
    } else if (mobilePattern.test(userAgent)) {
      return 'Mobile';
    } else if (desktopPattern.test(userAgent)) {
      if (userAgent.includes('Windows')) return 'Windows Desktop';
      if (userAgent.includes('Macintosh')) return 'Mac Desktop';
      if (userAgent.includes('Linux')) return 'Linux Desktop';
      return 'Desktop';
    }

    return 'Unknown Device';
  }

  private static extractBrowserInfo(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;

    // Simple browser detection patterns
    if (userAgent.includes('Chrome') && !userAgent.includes('Chromium')) {
      return `Chrome ${AuthController.extractVersion(userAgent, /Chrome\/([0-9]+)/)}`;
    } else if (userAgent.includes('Firefox')) {
      return `Firefox ${AuthController.extractVersion(userAgent, /Firefox\/([0-9]+)/)}`;
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return `Safari ${AuthController.extractVersion(userAgent, /Version\/([0-9]+)/)}`;
    } else if (userAgent.includes('Edge')) {
      return `Edge ${AuthController.extractVersion(userAgent, /Edge\/([0-9]+)/)}`;
    } else if (userAgent.includes('Opera')) {
      return `Opera ${AuthController.extractVersion(userAgent, /Opera\/([0-9]+)/)}`;
    }

    return 'Unknown Browser';
  }

  private static extractVersion(userAgent: string, pattern: RegExp): string {
    const match = userAgent.match(pattern);
    return match?.[1] || 'Unknown';
  }

}
