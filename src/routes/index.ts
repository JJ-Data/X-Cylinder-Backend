import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import uploadRoutes from './upload.routes';
import { outletRoutes } from './outlet.routes';
import { cylinderRoutes } from './cylinder.routes';
import { leaseRoutes } from './lease.routes';
import { refillRoutes } from './refill.routes';
import { customerRoutes } from './customer.routes';
import { qrRoutes } from './qr.routes';
import { analyticsRoutes } from './analytics.routes';
import transferRoutes from './transfer.routes';
import swapRoutes from './swap.routes';
import settingsRoutes from './settings.routes';
import { ApiResponse } from '@app-types/common.types';
import { CONSTANTS } from '@config/constants';
import { config } from '@config/environment';

const router: Router = Router();

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    message: 'Server is healthy',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: config.env,
    },
  };
  res.status(CONSTANTS.HTTP_STATUS.OK).json(response);
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);
router.use('/outlets', outletRoutes);
router.use('/cylinders', cylinderRoutes);
router.use('/leases', leaseRoutes);
router.use('/refills', refillRoutes);
router.use('/customers', customerRoutes);
router.use('/qr', qrRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/transfers', transferRoutes);
router.use('/swaps', swapRoutes);
router.use('/settings', settingsRoutes);

// API root endpoint
router.get('/', (_req, res) => {
  res.json({
    message: 'API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      users: '/users',
      upload: '/upload',
      outlets: '/outlets',
      cylinders: '/cylinders',
      leases: '/leases',
      refills: '/refills',
      customers: '/customers',
      qr: '/qr',
      analytics: '/analytics',
      transfers: '/transfers',
      swaps: '/swaps',
      settings: '/settings',
    },
  });
});

export default router;
