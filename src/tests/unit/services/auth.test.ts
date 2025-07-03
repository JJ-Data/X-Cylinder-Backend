// Mock all models and dependencies before imports
jest.mock('@models/User.model', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('@models/EmailVerificationToken.model', () => ({
  EmailVerificationToken: {
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('@models/PasswordResetToken.model', () => ({
  PasswordResetToken: {
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('@models/RefreshToken.model', () => ({
  RefreshToken: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('@services/email/EmailService', () => ({
  emailService: {
    sendEmail: jest.fn(),
    sendTemplate: jest.fn(),
  },
}));

jest.mock('@config/database', () => ({
  sequelize: {
    transaction: jest.fn(),
  },
}));

jest.mock('@utils/logger');

// Import after mocks are set up
import { AuthService } from '@services/auth.service';
import { User } from '@models/User.model';
import { EmailVerificationToken } from '@models/EmailVerificationToken.model';
import { PasswordResetToken } from '@models/PasswordResetToken.model';
import { RefreshToken } from '@models/RefreshToken.model';
import { emailService } from '@services/email/EmailService';
import { sequelize } from '@config/database';
import { ConflictError, UnauthorizedError, BadRequestError } from '@utils/errors';
import { CONSTANTS } from '@config/constants';

describe('AuthService', () => {
  let mockTransaction: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock transaction
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockUser = {
        id: 123,
        ...mockUserData,
        role: 'user',
        toJSON: jest.fn().mockReturnValue({ 
          id: 123, 
          ...mockUserData,
          role: 'user'
        }),
      };

      (User.findOne as jest.Mock).mockResolvedValueOnce(null);
      (User.create as jest.Mock).mockResolvedValueOnce(mockUser);
      (EmailVerificationToken.create as jest.Mock).mockResolvedValueOnce({
        token: 'verification-token',
      });
      (RefreshToken.create as jest.Mock).mockResolvedValueOnce({
        token: 'refresh-token',
      });
      (emailService.sendTemplate as jest.Mock).mockResolvedValueOnce({ success: true });

      const result = await AuthService.register(mockUserData);

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: mockUserData.email },
        transaction: mockTransaction,
      });
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockUserData.email,
          password: mockUserData.password,
          firstName: mockUserData.firstName,
          lastName: mockUserData.lastName,
          role: CONSTANTS.USER_ROLES.USER,
        }),
        { transaction: mockTransaction }
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      const mockUserData = {
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      (User.findOne as jest.Mock).mockResolvedValueOnce({ id: 1, email: mockUserData.email });

      await expect(AuthService.register(mockUserData))
        .rejects.toThrow(ConflictError);
      
      expect(User.create).not.toHaveBeenCalled();
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const mockUser = {
        id: 123,
        email: credentials.email,
        isActive: true,
        comparePassword: jest.fn().mockResolvedValueOnce(true),
        update: jest.fn().mockResolvedValueOnce(true),
        toJSON: jest.fn().mockReturnValue({ 
          id: 123, 
          email: credentials.email,
          firstName: 'Test',
          lastName: 'User',
          role: 'user'
        }),
      };

      (User.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (RefreshToken.create as jest.Mock).mockResolvedValueOnce({
        token: 'refresh-token',
      });

      const result = await AuthService.login(credentials);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: credentials.email } });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(credentials.password);
      expect(mockUser.update).toHaveBeenCalledWith({ lastLogin: expect.any(Date) });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error for invalid email', async () => {
      const credentials = {
        email: 'invalid@example.com',
        password: 'Password123!',
      };

      (User.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(AuthService.login(credentials))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should throw error for invalid password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const mockUser = {
        comparePassword: jest.fn().mockResolvedValueOnce(false),
        isActive: true,
      };

      (User.findOne as jest.Mock).mockResolvedValueOnce(mockUser);

      await expect(AuthService.login(credentials))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should throw error for inactive account', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const mockUser = {
        isActive: false,
        comparePassword: jest.fn().mockResolvedValueOnce(true),
      };

      (User.findOne as jest.Mock).mockResolvedValueOnce(mockUser);

      await expect(AuthService.login(credentials))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const verificationToken = 'verification-token-123';
      const mockUser = {
        id: 123,
        emailVerified: false,
        update: jest.fn().mockResolvedValueOnce(true),
        toPublicJSON: jest.fn().mockReturnValue({
          id: 123,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'user'
        }),
      };
      const mockToken = {
        userId: 123,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        update: jest.fn(),
      };

      (EmailVerificationToken.findOne as jest.Mock).mockResolvedValueOnce(mockToken);
      (User.findByPk as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await AuthService.verifyEmail(verificationToken);

      expect(EmailVerificationToken.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ token: verificationToken }),
          transaction: mockTransaction,
        })
      );
      expect(User.findByPk).toHaveBeenCalledWith(mockToken.userId, {
        transaction: mockTransaction,
      });
      expect(mockUser.update).toHaveBeenCalledWith(
        { emailVerified: true, emailVerifiedAt: expect.any(Date) },
        { transaction: mockTransaction }
      );
      expect(mockToken.update).toHaveBeenCalledWith(
        { verified: true, verifiedAt: expect.any(Date) },
        { transaction: mockTransaction }
      );
      expect(result).toHaveProperty('message', 'Email verified successfully');
      expect(result).toHaveProperty('user');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw error for invalid token', async () => {
      (EmailVerificationToken.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(AuthService.verifyEmail('invalid-token'))
        .rejects.toThrow(BadRequestError);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email successfully', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 123,
        email,
        firstName: 'Test',
      };
      const mockToken = {
        token: 'reset-token-123',
      };

      (User.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (PasswordResetToken.update as jest.Mock).mockResolvedValueOnce([1]);
      (PasswordResetToken.create as jest.Mock).mockResolvedValueOnce(mockToken);
      (emailService.sendTemplate as jest.Mock).mockResolvedValueOnce({ success: true });

      const result = await AuthService.forgotPassword(email);

      expect(User.findOne).toHaveBeenCalledWith({ 
        where: { email },
        transaction: mockTransaction
      });
      expect(PasswordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }), 
        { transaction: mockTransaction }
      );
      expect(emailService.sendTemplate).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });

    it('should not throw error for non-existent email', async () => {
      (User.findOne as jest.Mock).mockResolvedValueOnce(null);

      const result = await AuthService.forgotPassword('nonexistent@example.com');
      
      expect(result).toHaveProperty('message');
      expect(PasswordResetToken.create).not.toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(emailService.sendTemplate).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const token = 'reset-token-123';
      const newPassword = 'NewPassword123!';
      const mockUser = {
        id: 123,
        email: 'test@example.com',
        firstName: 'Test',
        update: jest.fn().mockResolvedValueOnce(true),
      };
      const mockToken = {
        userId: 123,
        used: false,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        destroy: jest.fn(),
        update: jest.fn(),
      };

      (PasswordResetToken.findOne as jest.Mock).mockResolvedValueOnce(mockToken);
      (User.findByPk as jest.Mock).mockResolvedValueOnce(mockUser);
      (emailService.sendTemplate as jest.Mock).mockResolvedValueOnce({ success: true });

      const result = await AuthService.resetPassword(token, newPassword);

      expect(PasswordResetToken.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { 
            token,
            used: false
          },
          transaction: mockTransaction,
        })
      );
      expect(User.findByPk).toHaveBeenCalledWith(mockToken.userId, {
        transaction: mockTransaction,
      });
      expect(mockUser.update).toHaveBeenCalledWith(
        { password: newPassword },
        { transaction: mockTransaction }
      );
      expect(mockToken.update).toHaveBeenCalledWith(
        { used: true },
        { transaction: mockTransaction }
      );
      expect(emailService.sendTemplate).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw error for invalid token', async () => {
      (PasswordResetToken.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(AuthService.resetPassword('invalid-token', 'NewPassword123!'))
        .rejects.toThrow(BadRequestError);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw error for expired token', async () => {
      const mockToken = {
        userId: 123,
        used: false,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        update: jest.fn(),
      };

      (PasswordResetToken.findOne as jest.Mock).mockResolvedValueOnce(mockToken);

      await expect(AuthService.resetPassword('expired-token', 'NewPassword123!'))
        .rejects.toThrow(BadRequestError);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const refreshToken = 'refresh-token-123';

      (RefreshToken.update as jest.Mock).mockResolvedValueOnce([1]);

      await AuthService.logout(refreshToken);

      expect(RefreshToken.update).toHaveBeenCalledWith(
        { revoked: true },
        { where: { token: refreshToken } }
      );
    });

    it('should handle logout when token not found', async () => {
      (RefreshToken.update as jest.Mock).mockResolvedValueOnce([0]);

      await expect(AuthService.logout('invalid-token'))
        .resolves.not.toThrow();
    });
  });
});