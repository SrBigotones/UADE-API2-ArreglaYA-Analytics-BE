import { Request, Response, NextFunction } from 'express';
import config from '../config';
import { logger } from '../config/logger';

/**
 * Middleware to block requests in production environment
 * Use this to protect test/development-only endpoints
 */
export const nonProductionOnly = (req: Request, res: Response, next: NextFunction): void => {
  const isProduction = config.nodeEnv === 'production';

  if (isProduction) {
    logger.warn(`Attempt to access non-production endpoint in production: ${req.method} ${req.path}`);
    res.status(403).json({
      success: false,
      message: 'This endpoint is not available in production environment'
    });
    return;
  }

  next();
};

