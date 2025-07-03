import { User } from '@models/User.model';
import { UserUpdateAttributes, UserPublicData } from '@app-types/user.types';
import { PaginationQuery } from '@app-types/common.types';
import { NotFoundError, ConflictError, BadRequestError } from '@utils/errors';
import { CONSTANTS } from '@config/constants';
import { Op, WhereOptions } from 'sequelize';

export class UserService {
  public static async getUserById(id: number): Promise<UserPublicData> {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user.toPublicJSON();
  }

  public static async getUsers(
    query: PaginationQuery & {
      role?: string;
      isActive?: boolean;
      emailVerified?: boolean;
      search?: string;
    }
  ): Promise<{ users: UserPublicData[]; total: number }> {
    const {
      page = CONSTANTS.DEFAULT_PAGE,
      pageSize = CONSTANTS.DEFAULT_PAGE_SIZE,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      role,
      isActive,
      emailVerified,
      search,
    } = query;

    const where: WhereOptions = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified;
    }

    if (search) {
      (where as any)[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * pageSize;

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: pageSize,
      offset,
      order: [[sortBy, sortOrder]],
    });

    const users = rows.map((user) => user.toPublicJSON());

    return {
      users,
      total: count,
    };
  }

  public static async updateUser(id: number, data: UserUpdateAttributes): Promise<UserPublicData> {
    const user = await User.findByPk(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await user.update(data);

    return user.toPublicJSON();
  }

  public static async updateEmail(
    userId: number,
    newEmail: string,
    password: string
  ): Promise<UserPublicData> {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify password
    if (!(await user.comparePassword(password))) {
      throw new BadRequestError('Invalid password');
    }

    // Check if email is already taken
    const existingUser = await User.findOne({
      where: {
        email: newEmail,
        id: { [Op.ne]: userId },
      },
    });

    if (existingUser) {
      throw new ConflictError(CONSTANTS.ERROR_MESSAGES.DUPLICATE_EMAIL);
    }

    await user.update({
      email: newEmail,
      emailVerified: false,
    });

    return user.toPublicJSON();
  }

  public static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      throw new BadRequestError('Current password is incorrect');
    }

    await user.update({ password: newPassword });
  }

  public static async deleteUser(id: number): Promise<void> {
    const user = await User.findByPk(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await user.destroy();
  }

  public static async toggleUserStatus(id: number): Promise<UserPublicData> {
    const user = await User.findByPk(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await user.update({ isActive: !user.isActive });

    return user.toPublicJSON();
  }

  public static async verifyEmail(userId: number): Promise<void> {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await user.update({ emailVerified: true });
  }
}
