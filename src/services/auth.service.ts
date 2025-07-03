import { User } from '@models/User.model';
import { RefreshToken } from '@models/RefreshToken.model';
import { PasswordResetToken } from '@models/PasswordResetToken.model';
import { EmailVerificationToken } from '@models/EmailVerificationToken.model';
import crypto from 'crypto';
import { LoginRequest, RegisterRequest, AuthTokens, JwtPayload } from '@app-types/auth.types';
import { UserCreationAttributes } from '@app-types/user.types';
import { UnauthorizedError, ConflictError, NotFoundError, BadRequestError } from '@utils/errors';
import {
  generateJWT,
  generateRefreshToken,
  verifyRefreshToken,
  parseJwtExpiration,
} from '@utils/helpers';
import { CONSTANTS } from '@config/constants';
import { sequelize } from '@config/database';
import { Transaction, Op } from 'sequelize';
import { emailService } from '@services/email/EmailService';
import { PasswordResetEmail } from '@services/email/templates/PasswordResetEmail';
import { PasswordChangeConfirmationEmail } from '@services/email/templates/PasswordChangeConfirmationEmail';
import { EmailVerificationEmail } from '@services/email/templates/EmailVerificationEmail';
import { config } from '@config/environment';

export class AuthService {
  public static async register(data: RegisterRequest): Promise<{ tokens: AuthTokens; user: any }> {
    const transaction = await sequelize.transaction();

    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        where: { email: data.email },
        transaction,
      });

      if (existingUser) {
        throw new ConflictError(CONSTANTS.ERROR_MESSAGES.DUPLICATE_EMAIL);
      }

      // Create user
      const userCreationData: UserCreationAttributes = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: CONSTANTS.USER_ROLES.CUSTOMER,
      };

      const user = await User.create(userCreationData, { transaction });

      // Send verification email
      await this.sendVerificationEmail(
        {
          id: user.id!,
          email: user.email,
          firstName: user.firstName,
        },
        transaction
      );

      // Generate tokens
      const tokens = await this.generateAuthTokens(user, transaction);

      await transaction.commit();

      return { 
        tokens,
        user: user.toPublicJSON()
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public static async login(data: LoginRequest): Promise<{ tokens: AuthTokens; user: any }> {
    const user = await User.findOne({
      where: { email: data.email },
    });

    if (!user || !(await user.comparePassword(data.password))) {
      throw new UnauthorizedError(CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled');
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    const tokens = await this.generateAuthTokens(user);

    return {
      tokens,
      user: user.toPublicJSON()
    };
  }

  public static async refreshTokens(refreshToken: string): Promise<{ tokens: AuthTokens; user: any }> {
    const transaction = await sequelize.transaction();

    try {
      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Find refresh token in database
      const storedToken = await RefreshToken.findOne({
        where: {
          token: refreshToken,
          userId: payload.id,
          revoked: false,
        },
        transaction,
      });

      if (!storedToken) {
        throw new UnauthorizedError(CONSTANTS.ERROR_MESSAGES.INVALID_TOKEN);
      }

      // Check if token is expired
      if (new Date() > storedToken.expiresAt) {
        await storedToken.update({ revoked: true }, { transaction });
        throw new UnauthorizedError(CONSTANTS.ERROR_MESSAGES.TOKEN_EXPIRED);
      }

      // Get user
      const user = await User.findByPk(payload.id, { transaction });
      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive');
      }

      // Revoke old token
      await storedToken.update({ revoked: true }, { transaction });

      // Generate new tokens
      const tokens = await this.generateAuthTokens(user, transaction);

      await transaction.commit();

      return {
        tokens,
        user: user.toPublicJSON()
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public static async logout(refreshToken: string): Promise<void> {
    await RefreshToken.update({ revoked: true }, { where: { token: refreshToken } });
  }

  public static async logoutAll(userId: number): Promise<void> {
    await RefreshToken.update({ revoked: true }, { where: { userId, revoked: false } });
  }

  private static async generateAuthTokens(
    user: any,
    transaction?: Transaction
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      outletId: user.outletId,
      paymentStatus: user.paymentStatus,
    };

    const accessToken = generateJWT(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token
    await RefreshToken.create(
      {
        token: refreshToken,
        userId: user.id,
        expiresAt: parseJwtExpiration('7d'),
      },
      { transaction }
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  public static async forgotPassword(email: string): Promise<{ message: string }> {
    const transaction = await sequelize.transaction();

    try {
      // Find user by email
      const user = await User.findOne({
        where: { email },
        transaction,
      });

      if (!user) {
        // Don't reveal whether the email exists or not for security reasons
        await transaction.commit();
        return {
          message: 'If an account exists with this email, a password reset link has been sent.',
        };
      }

      // Invalidate any existing password reset tokens for this user
      await PasswordResetToken.update(
        { used: true },
        {
          where: {
            userId: user.id!,
            used: false,
          },
          transaction,
        }
      );

      // Create new password reset token
      const resetToken = await PasswordResetToken.create(
        {
          userId: user.id!,
          token: crypto.randomBytes(32).toString('hex'),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
        { transaction }
      );

      // Generate reset URL (you may need to adjust this based on your frontend URL structure)
      const resetUrl = `${config.frontendUrl || 'http://localhost:3000'}/reset-password?token=${resetToken.token}`;

      // Send password reset email
      const passwordResetEmail = new PasswordResetEmail({
        firstName: user.firstName,
        resetUrl,
        expirationTime: '1 hour',
        companyName: config.companyName || 'CellerHut Logistics',
      });

      await emailService.sendTemplate(user.email, passwordResetEmail);

      await transaction.commit();

      return {
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const transaction = await sequelize.transaction();

    try {
      // Validate the token
      const resetToken = await PasswordResetToken.findOne({
        where: {
          token,
          used: false,
        },
        include: [
          {
            model: User,
            as: 'user',
          },
        ],
        transaction,
      });

      if (!resetToken) {
        throw new BadRequestError('Invalid or expired password reset token');
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        await resetToken.update({ used: true }, { transaction });
        throw new BadRequestError('Password reset token has expired');
      }

      // Get the associated user
      const user = await User.findByPk(resetToken.userId, { transaction });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Validate password strength
      if (newPassword.length < CONSTANTS.PASSWORD_MIN_LENGTH) {
        throw new BadRequestError(
          `Password must be at least ${CONSTANTS.PASSWORD_MIN_LENGTH} characters long`
        );
      }

      if (CONSTANTS.PASSWORD_REGEX && !CONSTANTS.PASSWORD_REGEX.test(newPassword)) {
        throw new BadRequestError(
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        );
      }

      // Update user's password
      await user.update({ password: newPassword }, { transaction });

      // Mark token as used
      await resetToken.update({ used: true }, { transaction });

      // Send confirmation email
      const confirmationEmail = new PasswordChangeConfirmationEmail({
        firstName: user.firstName,
        companyName: config.companyName || 'CellerHut Logistics',
        supportEmail: config.supportEmail || 'support@cellerhutlogistics.com',
      });

      await emailService.sendTemplate(user.email, confirmationEmail);

      // Optionally, you might want to logout all sessions for this user
      await this.logoutAll(user.id!);

      await transaction.commit();

      return {
        message: CONSTANTS.SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public static async validateResetToken(token: string): Promise<{
    valid: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      const resetToken = await PasswordResetToken.findOne({
        where: {
          token,
          used: false,
        },
        include: [
          {
            model: User,
            as: 'user',
          },
        ],
      });

      if (!resetToken) {
        return {
          valid: false,
          error: 'Invalid password reset token',
        };
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        return {
          valid: false,
          error: 'Password reset token has expired',
        };
      }

      const user = await User.findByPk(resetToken.userId);
      if (!user) {
        return {
          valid: false,
          error: 'User not found',
        };
      }

      return {
        valid: true,
        user: user.toPublicJSON(),
      };
    } catch (error) {
      return {
        valid: false,
        error: 'Error validating token',
      };
    }
  }

  public static async sendVerificationEmail(
    user: { id: number; email: string; firstName: string },
    transaction?: Transaction
  ): Promise<void> {
    try {
      // Invalidate any existing verification tokens for this user
      await EmailVerificationToken.update(
        { verified: true },
        {
          where: {
            userId: user.id!,
            verified: false,
          },
          transaction,
        }
      );

      // Create new verification token
      const verificationToken = await EmailVerificationToken.create(
        {
          userId: user.id!,
          token: crypto.randomBytes(32).toString('hex'),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
        { transaction }
      );

      // Generate verification URL
      const verificationUrl = `${config.frontendUrl || 'http://localhost:3000'}/verify-email?token=${verificationToken.token}`;

      // Send verification email
      const emailVerificationEmail = new EmailVerificationEmail({
        firstName: user.firstName,
        verificationUrl,
        expirationTime: '24 hours',
        companyName: config.companyName || 'CellerHut Logistics',
      });

      await emailService.sendTemplate(user.email, emailVerificationEmail);
    } catch (error) {
      // Log error but don't fail registration
      console.error('Failed to send verification email:', error);
    }
  }

  public static async verifyEmail(token: string): Promise<{ message: string; user?: any }> {
    const transaction = await sequelize.transaction();

    try {
      // Find the verification token
      const verificationToken = await EmailVerificationToken.findOne({
        where: {
          token,
          verified: false,
        },
        include: [
          {
            model: User,
            as: 'user',
          },
        ],
        transaction,
      });

      if (!verificationToken) {
        throw new BadRequestError('Invalid or already used verification token');
      }

      // Check if token is expired
      if (new Date() > verificationToken.expiresAt) {
        throw new BadRequestError('Verification token has expired');
      }

      // Get the user
      const user = await User.findByPk(verificationToken.userId, { transaction });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if email is already verified
      if (user.emailVerified) {
        await transaction.commit();
        return {
          message: 'Email is already verified',
          user: user.toPublicJSON(),
        };
      }

      // Update user's email verification status
      await user.update(
        {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
        { transaction }
      );

      // Mark token as verified
      await verificationToken.update(
        {
          verified: true,
          verifiedAt: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        message: 'Email verified successfully',
        user: user.toPublicJSON(),
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public static async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const transaction = await sequelize.transaction();

    try {
      // Find user by email
      const user = await User.findOne({
        where: { email },
        transaction,
      });

      if (!user) {
        // Don't reveal whether the email exists or not for security reasons
        await transaction.commit();
        return {
          message:
            'If an account exists with this email and is unverified, a new verification email has been sent.',
        };
      }

      // Check if email is already verified
      if (user.emailVerified) {
        await transaction.commit();
        return {
          message: 'Email is already verified.',
        };
      }

      // Check for recent verification tokens to prevent spam
      const recentToken = await EmailVerificationToken.findOne({
        where: {
          userId: user.id!,
          verified: false,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          },
        },
        transaction,
      });

      if (recentToken) {
        throw new BadRequestError(
          'Please wait a few minutes before requesting another verification email'
        );
      }

      // Send new verification email
      await this.sendVerificationEmail(
        {
          id: user.id!,
          email: user.email,
          firstName: user.firstName,
        },
        transaction
      );

      await transaction.commit();

      return {
        message:
          'If an account exists with this email and is unverified, a new verification email has been sent.',
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
