import { SchemaBuilder } from '../builder/SchemaBuilder';
import { OpenAPIV3_1 } from 'openapi-types';

const sb = new SchemaBuilder();

// Using the fluent pattern for auth schemas
export const authSchemas: Record<string, OpenAPIV3_1.SchemaObject> = {
  // Request schemas
  RegisterRequest: sb.object('RegisterRequest', {
    email: sb.string('User email address').format('email'),
    password: sb.string('User password').minLength(8),
    firstName: sb.string('User first name'),
    lastName: sb.string('User last name'),
  }).required(['email', 'password', 'firstName', 'lastName']).build(),

  LoginRequest: sb.object('LoginRequest', {
    email: sb.string('User email address').format('email'),
    password: sb.string('User password').example('userpassword123'),
  }).required(['email', 'password']).build(),

  RefreshTokenRequest: sb.object('RefreshTokenRequest', {
    refreshToken: sb.string('JWT refresh token').example('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
  }).required(['refreshToken']).build(),

  ForgotPasswordRequest: sb.object('ForgotPasswordRequest', {
    email: sb.string('User email address').format('email'),
  }).required(['email']).build(),

  ResetPasswordRequest: sb.object('ResetPasswordRequest', {
    token: sb.string('Password reset token').example('abc123...'),
    password: sb.string('New password').minLength(8),
  }).required(['token', 'password']).build(),

  ChangePasswordRequest: sb.object('ChangePasswordRequest', {
    currentPassword: sb.string('Current password'),
    newPassword: sb.string('New password').minLength(8),
  }).required(['currentPassword', 'newPassword']).build(),

  ResendVerificationRequest: sb.object('ResendVerificationRequest', {
    email: sb.string('User email address').format('email'),
  }).required(['email']).build(),

  // Response schemas
  AuthTokens: sb.object('AuthTokens', {
    accessToken: sb.string('JWT access token').example('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
    refreshToken: sb.string('JWT refresh token').example('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
  }).required(['accessToken', 'refreshToken']).build(),

  RegisterResponse: sb.object('RegisterResponse', {
    user: sb.object('UserInfo', {
      id: sb.integer('User ID'),
      email: sb.string('User email').format('email'),
      firstName: sb.string('First name'),
      lastName: sb.string('Last name'),
      role: sb.string('User role'),
    }),
    tokens: sb.object('AuthTokens', {
      accessToken: sb.string('JWT access token'),
      refreshToken: sb.string('JWT refresh token'),
    }),
    emailVerificationRequired: sb.boolean('Whether email verification is required'),
  }).required(['user', 'tokens', 'emailVerificationRequired']).build(),

  LoginResponse: sb.object('LoginResponse', {
    user: sb.object('UserInfo', {
      id: sb.integer('User ID'),
      email: sb.string('User email').format('email'),
      firstName: sb.string('First name'),
      lastName: sb.string('Last name'),
      role: sb.string('User role'),
      emailVerified: sb.boolean('Email verification status'),
      isActive: sb.boolean('Account active status'),
      lastLogin: sb.string('Last login timestamp').format('date-time').nullable(),
    }),
    tokens: sb.object('AuthTokens', {
      accessToken: sb.string('JWT access token'),
      refreshToken: sb.string('JWT refresh token'),
    }),
  }).required(['user', 'tokens']).build(),

  TokenResponse: sb.object('TokenResponse', {
    tokens: sb.object('AuthTokens', {
      accessToken: sb.string('JWT access token'),
      refreshToken: sb.string('JWT refresh token'),
    }),
  }).required(['tokens']).build(),

  MessageResponse: sb.object('MessageResponse', {
    message: sb.string('Response message'),
  }).required(['message']).build(),
};

// This demonstrates how the fluent pattern:
// 1. Is more readable and self-documenting
// 2. Provides better IDE autocomplete
// 3. Reduces repetitive JSON structure
// 4. Makes it easier to maintain consistency