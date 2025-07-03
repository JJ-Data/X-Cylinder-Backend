import request from 'supertest';
import { createApp } from '@/app';
import { Application } from 'express';
import { User } from '@models/User.model';
import { generateJWT } from '@utils/helpers';
import { cacheService } from '@services/cache';
import { sequelize } from '@config/database';
import * as bcrypt from 'bcrypt';

describe('User Routes Integration Tests', () => {
  let app: Application;
  let authToken: string;
  let testUser: User;

  beforeAll(async () => {
    app = createApp();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    // Clean database
    await User.destroy({ where: {}, force: true });
    await cacheService.flush();

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 10),
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isEmailVerified: true,
    });

    // Generate auth token
    authToken = generateJWT({
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });
  });

  describe('GET /api/v1/users/profile', () => {
    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User profile retrieved successfully',
        data: {
          user: {
            id: testUser.id,
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            role: testUser.role,
            isEmailVerified: true,
          },
        },
      });

      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('No token provided'),
      });
    });

    it('should use cache for repeated requests', async () => {
      // First request
      await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should hit cache
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['x-cache']).toBe('HIT');
    });
  });

  describe('PUT /api/v1/users/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1234567890',
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: testUser.id,
            email: testUser.email,
            firstName: updateData.firstName,
            lastName: updateData.lastName,
            phone: updateData.phone,
          },
        },
      });

      // Verify database update
      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser?.firstName).toBe(updateData.firstName);
      expect(updatedUser?.lastName).toBe(updateData.lastName);
      expect(updatedUser?.phone).toBe(updateData.phone);
    });

    it('should not allow updating email', async () => {
      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'newemail@example.com' })
        .expect(200);

      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should not allow updating role', async () => {
      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body.data.user.role).toBe('user');
    });

    it('should clear user cache after update', async () => {
      // Cache user profile
      await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Update profile
      await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'NewName' })
        .expect(200);

      // Next request should not hit cache
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['x-cache']).toBe('MISS');
      expect(response.body.data.user.firstName).toBe('NewName');
    });
  });

  describe('POST /api/v1/users/change-password', () => {
    it('should change password successfully', async () => {
      const response = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'NewSecurePassword123!',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password changed successfully',
      });

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'NewSecurePassword123!',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should reject incorrect current password', async () => {
      const response = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'NewPassword123!',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('password is incorrect'),
      });
    });

    it('should validate password requirements', async () => {
      const response = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'weak',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
      });
    });
  });

  describe('DELETE /api/v1/users/account', () => {
    it('should delete user account successfully', async () => {
      const response = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 'password123' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Account deleted successfully',
      });

      // Verify user is deleted
      const deletedUser = await User.findByPk(testUser.id);
      expect(deletedUser).toBeNull();

      // Verify cannot login with deleted account
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        })
        .expect(401);

      expect(loginResponse.body.success).toBe(false);
    });

    it('should reject deletion with incorrect password', async () => {
      const response = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 'wrongpassword' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('password is incorrect'),
      });

      // Verify user still exists
      const user = await User.findByPk(testUser.id);
      expect(user).toBeTruthy();
    });

    it('should require password for deletion', async () => {
      const response = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Password is required'),
      });
    });
  });

  describe('GET /api/v1/users', () => {
    let adminUser: User;
    let adminToken: string;

    beforeEach(async () => {
      // Create admin user
      adminUser = await User.create({
        email: 'admin@example.com',
        password: await bcrypt.hash('adminpassword', 10),
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isEmailVerified: true,
      });

      adminToken = generateJWT({
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      // Create additional users
      await User.bulkCreate([
        {
          email: 'user1@example.com',
          password: await bcrypt.hash('password', 10),
          firstName: 'User',
          lastName: 'One',
          role: 'user',
          isEmailVerified: true,
        },
        {
          email: 'user2@example.com',
          password: await bcrypt.hash('password', 10),
          firstName: 'User',
          lastName: 'Two',
          role: 'user',
          isEmailVerified: false,
        },
      ]);
    });

    it('should get all users as admin', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users: expect.arrayContaining([
            expect.objectContaining({ email: 'admin@example.com' }),
            expect.objectContaining({ email: 'test@example.com' }),
            expect.objectContaining({ email: 'user1@example.com' }),
            expect.objectContaining({ email: 'user2@example.com' }),
          ]),
          pagination: {
            page: 1,
            limit: 10,
            total: 4,
            totalPages: 1,
          },
        },
      });
    });

    it('should reject non-admin access', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Access denied'),
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users).toHaveLength(2);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 4,
        totalPages: 2,
      });
    });

    it('should support filtering by email verification', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .query({ isEmailVerified: true })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users).toHaveLength(3);
      expect(response.body.data.users.every((u: any) => u.isEmailVerified)).toBe(true);
    });

    it('should support searching by name or email', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .query({ search: 'user1' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.users[0].email).toBe('user1@example.com');
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    let adminToken: string;
    let targetUser: User;

    beforeEach(async () => {
      // Create admin user
      const adminUser = await User.create({
        email: 'admin@example.com',
        password: await bcrypt.hash('adminpassword', 10),
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isEmailVerified: true,
      });

      adminToken = generateJWT({
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      // Create target user
      targetUser = await User.create({
        email: 'target@example.com',
        password: await bcrypt.hash('password', 10),
        firstName: 'Target',
        lastName: 'User',
        role: 'user',
        isEmailVerified: false,
      });
    });

    it('should update user as admin', async () => {
      const response = await request(app)
        .put(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated',
          role: 'moderator',
          isEmailVerified: true,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User updated successfully',
        data: {
          user: {
            id: targetUser.id,
            email: targetUser.email,
            firstName: 'Updated',
            role: 'moderator',
            isEmailVerified: true,
          },
        },
      });
    });

    it('should reject non-admin access', async () => {
      const response = await request(app)
        .put(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Hacker' })
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Access denied'),
      });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Test' })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('User not found'),
      });
    });
  });
});