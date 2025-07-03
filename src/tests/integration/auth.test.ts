import request from 'supertest';
import { createApp } from '@/app';
import { Application } from 'express';
import { User } from '@models/User.model';
import { EmailVerificationToken } from '@models/EmailVerificationToken.model';
import { PasswordResetToken } from '@models/PasswordResetToken.model';
import { emailService } from '@services/email';
import { cacheService } from '@services/cache';
import { sequelize } from '@config/database';
import * as bcrypt from 'bcrypt';

// Mock email service
jest.mock('@services/email');

describe('Auth Routes Integration Tests', () => {
  let app: Application;

  beforeAll(async () => {
    app = createApp();
    // Ensure database is connected
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    // Clean database
    await User.destroy({ where: {}, force: true });
    await EmailVerificationToken.destroy({ where: {}, force: true });
    await PasswordResetToken.destroy({ where: {}, force: true });
    await cacheService.flush();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: 'user',
            isEmailVerified: false,
          },
        },
      });

      expect(response.body.data.user).not.toHaveProperty('password');
      expect(emailService.sendEmailVerificationEmail).toHaveBeenCalled();

      // Verify user was created in database
      const user = await User.findOne({ where: { email: userData.email } });
      expect(user).toBeTruthy();
      expect(user?.isEmailVerified).toBe(false);
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'SecurePassword123!',
        firstName: 'Existing',
        lastName: 'User',
      };

      // Create existing user
      await User.create({
        ...userData,
        password: await bcrypt.hash(userData.password, 10),
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('already exists'),
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password, firstName, lastName
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
      });
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('email'),
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: User;

    beforeEach(async () => {
      // Create verified user
      testUser = await User.create({
        email: 'test@example.com',
        password: await bcrypt.hash('SecurePassword123!', 10),
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          token: expect.any(String),
          user: {
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
          },
        },
      });

      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid email or password',
      });
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePassword123!',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid email or password',
      });
    });

    it('should reject login for unverified email', async () => {
      // Create unverified user
      await User.create({
        email: 'unverified@example.com',
        password: await bcrypt.hash('SecurePassword123!', 10),
        firstName: 'Unverified',
        lastName: 'User',
        isEmailVerified: false,
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'SecurePassword123!',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('verify'),
      });
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    it('should verify email successfully', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: await bcrypt.hash('password', 10),
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: false,
      });

      const token = await EmailVerificationToken.create({
        userId: user.id,
        token: 'test-verification-token',
      });

      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: token.token })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Email verified successfully',
      });

      // Verify user is now verified
      const updatedUser = await User.findByPk(user.id);
      expect(updatedUser?.isEmailVerified).toBe(true);

      // Verify token is deleted
      const deletedToken = await EmailVerificationToken.findOne({
        where: { token: token.token },
      });
      expect(deletedToken).toBeNull();
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid'),
      });
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: await bcrypt.hash('password', 10),
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
      });

      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password reset instructions sent to your email',
      });

      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();

      // Verify reset token was created
      const resetToken = await PasswordResetToken.findOne({
        where: { userId: user.id },
      });
      expect(resetToken).toBeTruthy();
    });

    it('should return success even for non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password reset instructions sent to your email',
      });

      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password successfully', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: await bcrypt.hash('oldPassword', 10),
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
      });

      const resetToken = await PasswordResetToken.create({
        userId: user.id,
        token: 'test-reset-token',
      });

      const newPassword = 'NewSecurePassword123!';

      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken.token,
          password: newPassword,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password reset successfully',
      });

      // Verify password was changed
      const updatedUser = await User.findByPk(user.id);
      const isPasswordValid = await bcrypt.compare(newPassword, updatedUser!.password);
      expect(isPasswordValid).toBe(true);

      // Verify token is deleted
      const deletedToken = await PasswordResetToken.findOne({
        where: { token: resetToken.token },
      });
      expect(deletedToken).toBeNull();

      expect(emailService.sendPasswordChangeConfirmation).toHaveBeenCalled();
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid'),
      });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: await bcrypt.hash('password', 10),
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
      });

      // Login first to get token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        })
        .expect(200);

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logged out successfully',
      });

      // Verify token is blacklisted
      const isBlacklisted = await cacheService.get(`blacklist:${token}`);
      expect(isBlacklisted).toBe(true);
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('No token provided'),
      });
    });
  });
});