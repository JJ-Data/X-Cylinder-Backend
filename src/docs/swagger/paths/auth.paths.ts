import { PathBuilder } from '../builder/PathBuilder';

const pb = new PathBuilder();

export const authPaths = {
  '/auth/register': {
    post: pb
      .endpoint('register', 'Authentication')
      .summary('Register a new user')
      .description('Create a new user account with email verification')
      .noAuth()
      .body('RegisterRequest')
      .response(201, 'RegisterResponse', 'User registered successfully')
      .response(400, 'ValidationError', 'Invalid input data')
      .response(409, 'Error', 'Email already exists')
      .response(429, 'TooManyRequests', 'Rate limit exceeded')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/auth/login': {
    post: pb
      .endpoint('login', 'Authentication')
      .summary('Login user')
      .description('Authenticate user and receive JWT tokens')
      .noAuth()
      .body('LoginRequest')
      .response(200, 'LoginResponse', 'Login successful')
      .response(400, 'ValidationError', 'Invalid input data')
      .response(401, 'Error', 'Invalid credentials')
      .response(429, 'TooManyRequests', 'Rate limit exceeded')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/auth/refresh': {
    post: pb
      .endpoint('refreshToken', 'Authentication')
      .summary('Refresh access token')
      .description('Get a new access token using a refresh token')
      .noAuth()
      .body('RefreshTokenRequest')
      .response(200, 'RefreshTokenResponse', 'Token refreshed successfully')
      .response(400, 'ValidationError', 'Invalid input data')
      .response(401, 'Error', 'Invalid or expired refresh token')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/auth/logout': {
    post: pb
      .endpoint('logout', 'Authentication')
      .summary('Logout user')
      .description('Revoke the provided refresh token')
      .noAuth()
      .body('RefreshTokenRequest')
      .response(200, 'SuccessResponse', 'Logged out successfully')
      .response(400, 'ValidationError', 'Invalid input data')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/auth/logout-all': {
    post: pb
      .endpoint('logoutAll', 'Authentication')
      .summary('Logout from all devices')
      .description('Revoke all refresh tokens for the authenticated user')
      .security([{ BearerAuth: [] }])
      .response(200, 'SuccessResponse', 'Logged out from all devices successfully')
      .response(401, 'Error', 'Unauthorized')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/auth/forgot-password': {
    post: pb
      .endpoint('forgotPassword', 'Authentication')
      .summary('Request password reset')
      .description('Send a password reset email to the user')
      .noAuth()
      .body('ForgotPasswordRequest')
      .response(200, 'SuccessResponse', 'Password reset email sent')
      .response(400, 'ValidationError', 'Invalid input data')
      .response(404, 'Error', 'User not found')
      .response(429, 'TooManyRequests', 'Rate limit exceeded')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/auth/reset-password': {
    post: pb
      .endpoint('resetPassword', 'Authentication')
      .summary('Reset password')
      .description('Reset user password using a valid reset token')
      .noAuth()
      .body('ResetPasswordRequest')
      .response(200, 'SuccessResponse', 'Password reset successfully')
      .response(400, 'ValidationError', 'Invalid input data')
      .response(401, 'Error', 'Invalid or expired token')
      .response(429, 'TooManyRequests', 'Rate limit exceeded')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/auth/validate-reset-token/{token}': {
    get: pb
      .endpoint('validateResetToken', 'Authentication')
      .summary('Validate password reset token')
      .description('Check if a password reset token is valid')
      .noAuth()
      .path('token', 'string', 'Password reset token')
      .response(200, 'SuccessResponse', 'Token validation result')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/auth/verify-email/{token}': {
    get: pb
      .endpoint('verifyEmail', 'Authentication')
      .summary('Verify email address')
      .description('Verify user email address using verification token')
      .noAuth()
      .path('token', 'string', 'Email verification token')
      .response(200, 'SuccessResponse', 'Email verified successfully')
      .response(400, 'Error', 'Invalid or expired token')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/auth/resend-verification-email': {
    post: pb
      .endpoint('resendVerificationEmail', 'Authentication')
      .summary('Resend verification email')
      .description('Resend email verification link to user')
      .noAuth()
      .body('ResendVerificationEmailRequest')
      .response(200, 'SuccessResponse', 'Verification email sent')
      .response(400, 'ValidationError', 'Invalid input data')
      .response(404, 'Error', 'User not found')
      .response(429, 'TooManyRequests', 'Rate limit exceeded')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },
};
