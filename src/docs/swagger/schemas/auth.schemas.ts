import { SchemaBuilder } from '../builder/SchemaBuilder';
import { exportSchemas } from '../builder/schemaExportHelper';

const sb = new SchemaBuilder();

// Request schemas
const RegisterRequestSchema = sb
  .object('RegisterRequest', {
    email: sb.string('User email').format('email').example('user@example.com'),
    password: sb.string('User password').example('password123'),
    firstName: sb.string('First name').example('John'),
    lastName: sb.string('Last name').example('Doe'),
  })
  .required(['email', 'password', 'firstName', 'lastName']);

const LoginRequestSchema = sb
  .object('LoginRequest', {
    email: sb.string('User email').format('email').example('user@example.com'),
    password: sb.string('User password').example('userpassword123'),
  })
  .required(['email', 'password']);

const RefreshTokenRequestSchema = sb
  .object('RefreshTokenRequest', {
    refreshToken: sb.string('JWT refresh token').example('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
  })
  .required(['refreshToken']);

const ForgotPasswordRequestSchema = sb
  .object('ForgotPasswordRequest', {
    email: sb.string('User email').format('email').example('user@example.com'),
  })
  .required(['email']);

const ResetPasswordRequestSchema = sb
  .object('ResetPasswordRequest', {
    token: sb.string('Password reset token').example('abc123def456'),
    password: sb.string('New password').example('newpassword123'),
  })
  .required(['token', 'password']);

const ResendVerificationEmailRequestSchema = sb
  .object('ResendVerificationEmailRequest', {
    email: sb.string('User email').format('email').example('user@example.com'),
  })
  .required(['email']);

// Response schemas
const AuthTokensSchema = sb
  .object('AuthTokens', {
    accessToken: sb.string('JWT access token').example('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
    refreshToken: sb.string('JWT refresh token').example('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
  })
  .required(['accessToken', 'refreshToken']);

const UserPublicRefSchema = sb.object('UserPublicRef', {
  id: sb.integer('User ID').example(1),
  email: sb.string('User email').format('email').example('user@example.com'),
  firstName: sb.string('First name').example('John'),
  lastName: sb.string('Last name').example('Doe'),
  role: sb.enum(['admin', 'staff', 'customer', 'refill_operator'], 'User role').example('customer'),
  isActive: sb.boolean('User active status').example(true),
  emailVerified: sb.boolean('Email verification status').example(true),
  emailVerifiedAt: sb.string('Email verification timestamp').format('date-time').nullable(),
  lastLogin: sb.string('Last login timestamp').format('date-time').nullable(),
  createdAt: sb.string('Creation timestamp').format('date-time'),
  updatedAt: sb.string('Update timestamp').format('date-time'),
});

const RegisterResponseSchema = sb.object('RegisterResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('User registered successfully'),
  data: sb
    .object('RegisterData', {
      user: UserPublicRefSchema,
      tokens: AuthTokensSchema,
      emailVerificationRequired: sb
        .boolean('Indicates if email verification is required')
        .example(true),
    })
    .required(['user', 'tokens', 'emailVerificationRequired']),
});

const LoginResponseSchema = sb.object('LoginResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Login successful'),
  data: sb
    .object('LoginData', {
      user: UserPublicRefSchema,
      tokens: AuthTokensSchema,
    })
    .required(['user', 'tokens']),
});

const RefreshTokenResponseSchema = sb.object('RefreshTokenResponse', {
  success: sb.boolean('Request success status').example(true),
  message: sb.string('Response message').example('Tokens refreshed successfully'),
  data: AuthTokensSchema,
});

const PasswordResetTokenValidationSchema = sb
  .object('PasswordResetTokenValidation', {
    valid: sb.boolean('Indicates if the token is valid').example(true),
    email: sb
      .string('Email associated with the token')
      .format('email')
      .example('user@example.com')
      .optional(),
  })
  .required(['valid']);

// Export all schemas as OpenAPI objects
const schemas = {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
  ResendVerificationEmailRequestSchema,
  AuthTokensSchema,
  RegisterResponseSchema,
  LoginResponseSchema,
  RefreshTokenResponseSchema,
  PasswordResetTokenValidationSchema,
};

// Export all schemas as a single object for consistency with other schema files
export const authSchemas = exportSchemas(schemas);
