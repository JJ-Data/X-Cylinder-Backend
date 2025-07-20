import { Router, IRouter } from 'express';
import { settingsController } from '@controllers/settings.controller';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { adminMiddleware } from '@middlewares/admin.middleware';
import { validate } from '@middlewares/validation.middleware';
import { UserRole } from '@config/constants';
import { settingsValidation } from '@utils/validations/settings.validation';

const router: IRouter = Router();

// Apply authentication to all routes
router.use(authenticate);

// Public routes (authenticated users can read settings)
router.get('/', settingsController.getAllSettings);
router.get('/categories', settingsController.getCategories);
router.get('/statistics', settingsController.getStatistics);
router.get('/category/:category', settingsController.getSettingsByCategory);
router.get('/key/:key', settingsController.getSetting);
router.get('/quote', settingsController.getQuote);
router.get('/validate/:operationType', settingsController.validatePricingConfig);
router.get('/projection/:operationType', settingsController.getRevenueProjection);
router.get('/competitive/:operationType', settingsController.getCompetitivePricing);

// Pricing calculation routes (authenticated users can calculate prices)
router.post('/price/calculate', 
  validate(settingsValidation.calculatePrice),
  settingsController.calculatePrice
);

router.post('/price/bulk', 
  validate(settingsValidation.calculateBulkPrice),
  settingsController.calculateBulkPrice
);

// Admin-only routes (require admin privileges)
router.use(adminMiddleware);

router.post('/', 
  validate(settingsValidation.createOrUpdateSetting),
  settingsController.createOrUpdateSetting
);

router.delete('/:id', 
  validate(settingsValidation.deleteSetting),
  settingsController.deleteSetting
);

router.get('/export', settingsController.exportSettings);

router.post('/import', 
  validate(settingsValidation.importSettings),
  settingsController.importSettings
);

export default router;