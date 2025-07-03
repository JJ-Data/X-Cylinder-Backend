import { Router } from 'express';
import { UserController } from '@controllers/user.controller';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { validateBody, validateParams, validateQuery } from '@middlewares/validation.middleware';
import { userValidation, authValidation } from '@utils/validation';
import { CONSTANTS } from '@config/constants';

const router: Router = Router();

// Protected routes - User
router.get(
  '/profile',
  authenticate,
  UserController.getProfile
);

router.patch(
  '/profile',
  authenticate,
  validateBody(userValidation.updateProfile),
  UserController.updateProfile
);

router.patch(
  '/email',
  authenticate,
  validateBody(userValidation.updateEmail),
  UserController.updateEmail
);

router.patch(
  '/password',
  authenticate,
  validateBody(authValidation.changePassword),
  UserController.changePassword
);

// Protected routes - Admin
router.get(
  '/',
  authenticate,
  authorize(CONSTANTS.USER_ROLES.ADMIN),
  validateQuery(userValidation.getUsers),
  UserController.getUsers
);

router.get(
  '/:id',
  authenticate,
  authorize(CONSTANTS.USER_ROLES.ADMIN),
  validateParams(userValidation.getUserById),
  UserController.getUserById
);

router.delete(
  '/:id',
  authenticate,
  authorize(CONSTANTS.USER_ROLES.ADMIN),
  validateParams(userValidation.getUserById),
  UserController.deleteUser
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize(CONSTANTS.USER_ROLES.ADMIN),
  validateParams(userValidation.getUserById),
  UserController.toggleUserStatus
);

export default router;