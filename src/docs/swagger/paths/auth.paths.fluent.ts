import { PathBuilder } from '../builder/PathBuilder';

const pb = new PathBuilder();

export const authPaths = {
  '/auth/register': {
    post: pb
      .endpoint('register', 'Authentication')
      .summary('Register a new user')
      .description('Create a new user account with email verification')
      .security([])
      .body('RegisterRequest')
      .response(201, 'RegisterResponse', 'User registered successfully')
      .response(400, 'ValidationError', 'Validation error')
      .response(409, 'ErrorResponse', 'Conflict - Email already exists')
      .response(429, 'TooManyRequestsError', 'Too many requests')
      .response(500, 'InternalServerError', 'Internal server error')
      .build(),
  },

  '/auth/login': {
    post: pb
      .endpoint('login', 'Authentication')
      .summary('Login with email and password')
      .description('Authenticate user and receive JWT tokens')
      .security([])
      .body('LoginRequest')
      .response(200, 'LoginResponse', 'Login successful')
      .response(401, 'UnauthorizedError', 'Invalid credentials')
      .response(403, 'ForbiddenError', 'Account not verified or inactive')
      .response(429, 'TooManyRequestsError', 'Too many requests')
      .response(500, 'InternalServerError', 'Internal server error')
      .build(),
  },

  '/auth/refresh': {
    post: pb
      .endpoint('refreshToken', 'Authentication')
      .summary('Refresh access token')
      .description('Use refresh token to get new access token')
      .security([])
      .body('RefreshTokenRequest')
      .response(200, 'TokenResponse', 'Token refreshed successfully')
      .response(401, 'UnauthorizedError', 'Invalid or expired refresh token')
      .response(500, 'InternalServerError', 'Internal server error')
      .build(),
  },

  '/auth/logout': {
    post: pb
      .endpoint('logout', 'Authentication')
      .summary('Logout user')
      .description('Invalidate refresh token and end session')
      .response(204, 'NoContent', 'Logout successful')
      .response(401, 'UnauthorizedError', 'Unauthorized')
      .response(500, 'InternalServerError', 'Internal server error')
      .build(),
  },

  '/auth/forgot-password': {
    post: pb
      .endpoint('forgotPassword', 'Authentication')
      .summary('Request password reset')
      .description('Send password reset link to email')
      .security([])
      .body('ForgotPasswordRequest')
      .response(200, 'MessageResponse', 'Password reset email sent')
      .response(400, 'ValidationError', 'Validation error')
      .response(404, 'NotFoundError', 'User not found')
      .response(429, 'TooManyRequestsError', 'Too many requests')
      .response(500, 'InternalServerError', 'Internal server error')
      .build(),
  },

  '/auth/reset-password': {
    post: pb
      .endpoint('resetPassword', 'Authentication')
      .summary('Reset password')
      .description('Reset password using token from email')
      .security([])
      .body('ResetPasswordRequest')
      .response(200, 'MessageResponse', 'Password reset successful')
      .response(400, 'ValidationError', 'Invalid or expired token')
      .response(500, 'InternalServerError', 'Internal server error')
      .build(),
  },

  '/auth/change-password': {
    post: pb
      .endpoint('changePassword', 'Authentication')
      .summary('Change password')
      .description('Change password for authenticated user')
      .body('ChangePasswordRequest')
      .response(200, 'MessageResponse', 'Password changed successfully')
      .response(400, 'ValidationError', 'Validation error')
      .response(401, 'UnauthorizedError', 'Invalid current password')
      .response(500, 'InternalServerError', 'Internal server error')
      .build(),
  },

  '/auth/verify-email': {
    get: pb
      .endpoint('verifyEmail', 'Authentication')
      .summary('Verify email address')
      .description('Verify email using token from verification email')
      .security([])
      .query('token', 'string', true, 'Verification token')
      .response(200, 'MessageResponse', 'Email verified successfully')
      .response(400, 'ValidationError', 'Invalid or expired token')
      .response(500, 'InternalServerError', 'Internal server error')
      .build(),
  },

  '/auth/resend-verification': {
    post: pb
      .endpoint('resendVerification', 'Authentication')
      .summary('Resend verification email')
      .description('Request new verification email')
      .security([])
      .body('ResendVerificationRequest')
      .response(200, 'MessageResponse', 'Verification email sent')
      .response(400, 'ValidationError', 'Email already verified')
      .response(404, 'NotFoundError', 'User not found')
      .response(429, 'TooManyRequestsError', 'Too many requests')
      .response(500, 'InternalServerError', 'Internal server error')
      .build(),
  },
};

// This demonstrates how much cleaner and more maintainable the fluent pattern is
// compared to the raw OpenAPI object approach