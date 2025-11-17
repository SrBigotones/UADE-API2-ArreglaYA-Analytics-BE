import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Middleware para loggear requests y medir tiempos de respuesta
 * Útil para identificar endpoints lentos que causan 503
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Log request
  logger.info(`📥 [${requestId}] ${req.method} ${req.path}`, {
    query: req.query,
    filters: {
      rubro: req.query.rubro,
      zona: req.query.zona,
      fechaDesde: req.query.fechaDesde,
      fechaHasta: req.query.fechaHasta
    }
  });

  // Interceptar el envío de la respuesta
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log response con color según status
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const emoji = statusCode >= 500 ? '❌' : statusCode >= 400 ? '⚠️' : '✅';

    logger[logLevel](`${emoji} [${requestId}] ${req.method} ${req.path} → ${statusCode} (${duration}ms)`, {
      duration,
      statusCode,
      path: req.path
    });

    // Alerta si tarda más de 5 segundos
    if (duration > 5000) {
      logger.warn(`🐌 SLOW ENDPOINT: ${req.method} ${req.path} took ${duration}ms`, {
        query: req.query,
        duration
      });
    }

    return originalSend.call(this, data);
  };

  next();
};
