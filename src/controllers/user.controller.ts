import { Request, Response, NextFunction } from 'express';
import { UserService } from '@services/user.service';
import { ResponseUtil } from '@utils/response';
import { CONSTANTS } from '@config/constants';

export class UserController {
  public static async createUser(
    req: Request<{}, {}, {
      email: string;
      name: string;
      password: string;
      role: string;
      outletId?: number;
    }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await UserService.createUser(req.body);

      ResponseUtil.success(res, user, CONSTANTS.SUCCESS_MESSAGES.RESOURCE_CREATED);
    } catch (error) {
      next(error);
    }
  }

  public static async updateUser(
    req: Request<{ id: string }, {}, {
      name?: string;
      role?: string;
      outletId?: number;
      phoneNumber?: string;
      alternatePhone?: string;
      address?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      const user = await UserService.updateUser(userId, req.body);

      ResponseUtil.success(res, user, CONSTANTS.SUCCESS_MESSAGES.RESOURCE_UPDATED);
    } catch (error) {
      next(error);
    }
  }

  public static async getProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.unauthorized(res);
        return;
      }

      const user = await UserService.getUserById(req.user.id);

      ResponseUtil.success(res, user);
    } catch (error) {
      next(error);
    }
  }

  public static async getUserById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      const user = await UserService.getUserById(userId);

      ResponseUtil.success(res, user);
    } catch (error) {
      next(error);
    }
  }

  public static async getUsers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Parse query parameters with proper types
      const query = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'ASC' | 'DESC',
        role: req.query.role as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        emailVerified: req.query.emailVerified ? req.query.emailVerified === 'true' : undefined,
        search: req.query.search as string,
      };

      const { users, total } = await UserService.getUsers(query);

      const page = query.page || CONSTANTS.DEFAULT_PAGE;
      const pageSize = query.pageSize || CONSTANTS.DEFAULT_PAGE_SIZE;

      ResponseUtil.paginated(res, users, page, pageSize, total);
    } catch (error) {
      next(error);
    }
  }

  public static async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.unauthorized(res);
        return;
      }

      const user = await UserService.updateUser(req.user.id, req.body);

      ResponseUtil.success(res, user, CONSTANTS.SUCCESS_MESSAGES.RESOURCE_UPDATED);
    } catch (error) {
      next(error);
    }
  }

  public static async updateEmail(
    req: Request<{}, {}, { email: string; password: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.unauthorized(res);
        return;
      }

      const user = await UserService.updateEmail(
        req.user.id,
        req.body.email,
        req.body.password
      );

      ResponseUtil.success(res, user, 'Email updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async changePassword(
    req: Request<{}, {}, { currentPassword: string; newPassword: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.unauthorized(res);
        return;
      }

      await UserService.changePassword(
        req.user.id,
        req.body.currentPassword,
        req.body.newPassword
      );

      ResponseUtil.success(res, null, CONSTANTS.SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS);
    } catch (error) {
      next(error);
    }
  }

  public static async deleteUser(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      await UserService.deleteUser(userId);

      ResponseUtil.success(res, null, CONSTANTS.SUCCESS_MESSAGES.RESOURCE_DELETED);
    } catch (error) {
      next(error);
    }
  }

  public static async toggleUserStatus(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      const user = await UserService.toggleUserStatus(userId);

      ResponseUtil.success(res, user, 'User status updated successfully');
    } catch (error) {
      next(error);
    }
  }
}