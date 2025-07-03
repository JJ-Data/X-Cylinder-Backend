import { Router } from 'express';
import { AuthController } from '@controllers/auth.controller';
import { validateBody } from '@middlewares/validation.middleware';
import { authValidation } from '@utils/validation';
import { authRateLimiter } from '@middlewares/rateLimit.middleware';
import { authenticate } from '@middlewares/auth.middleware';

const router: Router = Router();

// Public routes
router.post(
  '/register',
  authRateLimiter,
  validateBody(authValidation.register),
  AuthController.register
);

router.post('/login', validateBody(authValidation.login), AuthController.login);

router.post('/refresh', validateBody(authValidation.refreshToken), AuthController.refreshToken);

router.post('/logout', validateBody(authValidation.refreshToken), AuthController.logout);

router.post(
  '/forgot-password',
  authRateLimiter,
  validateBody(authValidation.forgotPassword),
  AuthController.forgotPassword
);

router.post(
  '/reset-password',
  authRateLimiter,
  validateBody(authValidation.resetPassword),
  AuthController.resetPassword
);

router.get('/validate-reset-token/:token', AuthController.validateResetToken);

router.get('/verify-email/:token', AuthController.verifyEmail);

router.post(
  '/resend-verification-email',
  authRateLimiter,
  validateBody(authValidation.resendVerificationEmail),
  AuthController.resendVerificationEmail
);

// Protected routes
router.get('/me', authenticate, AuthController.getCurrentUser);
router.post('/logout-all', authenticate, AuthController.logoutAll);

export default router;
