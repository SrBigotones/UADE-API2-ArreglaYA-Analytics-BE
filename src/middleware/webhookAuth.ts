import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../config/logger';
import config from '../config';

/**
 * Middleware para verificar la firma HMAC de webhooks del Core Hub
 * 
 * El Core Hub envía un header 'x-hub-signature-256' con la firma del payload
 * usando HMAC-SHA256 y el secret compartido.
 * 
 * Para habilitar en producción:
 * 1. Configurar WEBHOOK_SECRET en variables de entorno
 * 2. Configurar ENABLE_WEBHOOK_SIGNATURE_VALIDATION=true
 * 
 * Uso:
 * router.post('/webhook', verifyWebhookSignature, controller.handleWebhook)
 */
export const verifyWebhookSignature = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Si la validación no está habilitada, continuar sin validar
  if (!config.enableWebhookSignatureValidation) {
    logger.debug('Webhook signature validation disabled');
    next();
    return;
  }

  // Si está habilitado pero no hay secret configurado, es un error de configuración
  if (!config.webhookSecret || config.webhookSecret === 'your-webhook-secret') {
    logger.error('Webhook signature validation enabled but no valid secret configured');
    res.status(500).json({ 
      success: false,
      error: 'Configuration error',
      message: 'Webhook signature validation is misconfigured' 
    });
    return;
  }

  try {
    // Obtener la firma del header
    const signature = req.headers['x-hub-signature-256'] as string;
    
    if (!signature) {
      logger.warn('Webhook received without signature', {
        headers: req.headers,
        ip: req.ip
      });
      res.status(401).json({ 
        success: false, 
        error: 'Missing signature',
        message: 'Webhook signature is required' 
      });
      return;
    }

    // Calcular la firma esperada
    const payload = JSON.stringify(req.body);
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', config.webhookSecret)
      .update(payload)
      .digest('hex');

    // Comparación segura contra timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      logger.warn('Invalid webhook signature', {
        receivedSignature: signature.substring(0, 15) + '...',
        ip: req.ip
      });
      res.status(401).json({ 
        success: false,
        error: 'Invalid signature',
        message: 'Webhook signature verification failed' 
      });
      return;
    }

    // Firma válida, continuar con el request
    logger.debug('Webhook signature verified successfully');
    next();

  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    res.status(500).json({ 
      success: false,
      error: 'Signature verification error',
      message: 'Error processing webhook signature'
    });
  }
};

