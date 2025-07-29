import { Router } from 'express';
import { emailController } from '@controllers/email.controller';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { CONSTANTS } from '@config/constants';

const router = Router();

// All email testing routes require authentication and admin privileges
router.use(authenticate);
router.use(authorize(CONSTANTS.USER_ROLES.ADMIN));

// Test email connection
router.get('/test/connection', emailController.testConnection);

// Test specific email templates
router.post('/test/customer-registration', emailController.testCustomerRegistration);
router.post('/test/customer-welcome', emailController.testCustomerWelcome);
router.post('/test/welcome', emailController.testWelcomeEmail);
router.post('/test/plain', emailController.testPlainEmail);

// Get email template previews
router.get('/templates', emailController.listTemplates);
router.get('/templates/:type/preview', emailController.getTemplatePreview);

export const emailRoutes: Router = router;