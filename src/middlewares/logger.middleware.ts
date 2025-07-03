import { Request, Response, NextFunction } from 'express';
import { logger } from '@utils/logger';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Add request ID
  req.requestId = uuidv4();
  req.startTime = Date.now();

  // Log request
  logger.info('Request received', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  });

  // Log response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const responseTime = Date.now() - (req.startTime || 0);

    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
    });

    return originalSend.call(this, data);
  };

  next();
};
