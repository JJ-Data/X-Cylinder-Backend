import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { config } from '@config/environment';
import { CONSTANTS } from '@config/constants';
import { errorHandler } from '@middlewares/error.middleware';
import { requestLogger } from '@middlewares/logger.middleware';
import { rateLimiter } from '@middlewares/rateLimit.middleware';
import routes from '@routes/index';
import { ApiResponse } from '@app-types/common.types';
import { openApiDocument } from '@docs/swagger';

export const createApp = (): Application => {
  const app: Application = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.isDevelopment
        ? ['http://localhost:3001', 'http://localhost:3000']
        : process.env.ALLOWED_ORIGINS?.split(',') || [],
      credentials: true,
    })
  );

  // Cookie parser middleware
  app.use(cookieParser(config.cookie.secret));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression middleware
  app.use(compression());

  // Request logging
  app.use(requestLogger);

  // Rate limiting
  // app.use(rateLimiter);

  // Serve static files for local storage (only in development or when using local storage)
  if (config.storage.provider === 'local') {
    const uploadsPath = path.isAbsolute(config.storage.local.path)
      ? config.storage.local.path
      : path.join(process.cwd(), config.storage.local.path);

    app.use(
      '/uploads',
      express.static(uploadsPath, {
        maxAge: '7d',
        setHeaders: (res, filePath) => {
          // Set appropriate headers for different file types
          if (filePath.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
          } else if (filePath.match(/\.(pdf|doc|docx)$/i)) {
            res.setHeader('Content-Disposition', 'inline');
          }
        },
      })
    );
  }

  // Swagger UI documentation
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'CellerHut Logistics API Documentation',
      customfavIcon: '/favicon.ico',
    })
  );

  // API routes
  app.use(`${CONSTANTS.API_PREFIX}/${CONSTANTS.API_VERSION}`, routes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    const response: ApiResponse = {
      success: false,
      error: CONSTANTS.ERROR_MESSAGES.NOT_FOUND,
    };
    res.status(CONSTANTS.HTTP_STATUS.NOT_FOUND).json(response);
  });

  // Global error handler
  app.use(errorHandler);

  return app;
};

export default createApp;
