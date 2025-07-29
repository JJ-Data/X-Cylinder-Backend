import { User } from '@models/User.model';
import { UserUpdateAttributes, UserPublicData, UserCreationAttributes } from '@app-types/user.types';
import { PaginationQuery } from '@app-types/common.types';
import { NotFoundError, ConflictError, BadRequestError } from '@utils/errors';
import { CONSTANTS } from '@config/constants';
import { Op, WhereOptions } from 'sequelize';

export class UserService {
  public static async createUser(data: {
    email: string;
    name: string;
    password: string;
    role: string;
    outletId?: number;
  }): Promise<UserPublicData> {
    // Split name into firstName and lastName
    const nameParts = data.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    if (!firstName) {
      throw new BadRequestError('Name must contain at least a first name');
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError(CONSTANTS.ERROR_MESSAGES.DUPLICATE_EMAIL);
    }

    // Validate role
    if (!Object.values(CONSTANTS.USER_ROLES).includes(data.role as any)) {
      throw new BadRequestError('Invalid user role');
    }

    // Validate outlet requirement for staff and refill operators
    if ((data.role === CONSTANTS.USER_ROLES.STAFF || data.role === CONSTANTS.USER_ROLES.REFILL_OPERATOR) && !data.outletId) {
      throw new BadRequestError('Outlet assignment is required for staff and refill operators');
    }

    // Create user data
    const userData: UserCreationAttributes = {
      email: data.email.toLowerCase().trim(),
      password: data.password,
      firstName,
      lastName,
      role: data.role as any,
      outletId: data.outletId,
      isActive: true,
      emailVerified: true, // Admin-created users are automatically verified
    };

    // Set payment status for customers
    if (data.role === CONSTANTS.USER_ROLES.CUSTOMER) {
      userData.paymentStatus = 'pending';
    }

    const user = await User.create(userData);

    return user.toPublicJSON();
  }

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

  public static async updateUser(id: number, data: {
    name?: string;
    role?: string;
    outletId?: number;
    phoneNumber?: string;
    alternatePhone?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }): Promise<UserPublicData> {
    const user = await User.findByPk(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Prepare update data
    const updateData: Partial<UserUpdateAttributes> = {};

    // Handle name field - split into firstName and lastName
    if (data.name) {
      const nameParts = data.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      if (!firstName) {
        throw new BadRequestError('Name must contain at least a first name');
      }

      updateData.firstName = firstName;
      updateData.lastName = lastName;
    }

    // Handle role change
    if (data.role) {
      // Validate role
      if (!Object.values(CONSTANTS.USER_ROLES).includes(data.role as any)) {
        throw new BadRequestError('Invalid user role');
      }
      updateData.role = data.role as any;
    }

    // Handle outlet assignment
    if (data.outletId !== undefined) {
      updateData.outletId = data.outletId;
    }

    // Validate outlet requirement for staff and refill operators
    const finalRole = data.role || user.role;
    const finalOutletId = data.outletId !== undefined ? data.outletId : user.outletId;
    
    if ((finalRole === CONSTANTS.USER_ROLES.STAFF || finalRole === CONSTANTS.USER_ROLES.REFILL_OPERATOR) && !finalOutletId) {
      throw new BadRequestError('Outlet assignment is required for staff and refill operators');
    }

    // Handle profile fields
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber || undefined;
    if (data.alternatePhone !== undefined) updateData.alternatePhone = data.alternatePhone || undefined;
    if (data.address !== undefined) updateData.address = data.address || undefined;
    if (data.city !== undefined) updateData.city = data.city || undefined;
    if (data.state !== undefined) updateData.state = data.state || undefined;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode || undefined;

    await user.update(updateData);

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
