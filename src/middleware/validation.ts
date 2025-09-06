import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../config/logger';

export const webhookValidation = [
  body('queue').notEmpty().withMessage('Queue is required'),
  body('event').isObject().withMessage('Event must be an object'),
  body('event.squad').notEmpty().withMessage('Event squad is required'),
  body('event.topico').notEmpty().withMessage('Event topico is required'),
  body('event.evento').notEmpty().withMessage('Event evento is required'),
  body('event.cuerpo').isObject().withMessage('Event cuerpo must be an object'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];
