import { Request, Response } from 'express';
import { featureFlagService, FEATURE_FLAGS } from '../services/FeatureFlagService';
import { logger } from '../config/logger';
import { config } from '../config';

export class FeatureFlagController {
  /**
   * Obtiene todos los feature flags
   * Endpoint oculto (no aparece en Swagger)
   */
  async getAllFlags(req: Request, res: Response): Promise<void> {
    try {
      const flags = await featureFlagService.getAllFlags();
      
      logger.info('Feature flags consultados', {
        count: flags.length,
        environment: config.nodeEnv
      });

      res.status(200).json({
        success: true,
        flags: flags.map(flag => ({
          key: flag.key,
          enabled: flag.enabled,
          updatedAt: flag.updatedAt
        }))
      });
    } catch (error) {
      logger.error('Error al obtener feature flags', {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });

      res.status(500).json({
        success: false,
        error: 'Error al obtener feature flags'
      });
    }
  }

  /**
   * Toggle de un feature flag específico
   * Endpoint oculto (no aparece en Swagger) 
   */
  async toggleFlag(req: Request, res: Response): Promise<void> {
    try {
      const { key, enabled } = req.body;

      if (!key || typeof enabled !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Parámetros inválidos',
          message: 'Se requiere "key" (string) y "enabled" (boolean)'
        });
        return;
      }

      // Validar que el key sea uno de los flags conocidos
      const validKeys = Object.values(FEATURE_FLAGS);
      if (!validKeys.includes(key)) {
        res.status(400).json({
          success: false,
          error: 'Feature flag inválido',
          message: `Los feature flags válidos son: ${validKeys.join(', ')}`
        });
        return;
      }

      const flag = await featureFlagService.toggleFlag(key, enabled);

      logger.warn(`⚠️  FEATURE FLAG MODIFICADO: ${key} = ${enabled}`, {
        key,
        enabled,
        environment: config.nodeEnv,
        updatedAt: flag.updatedAt
      });

      // Advertencia especial para producción
      if (config.nodeEnv === 'production') {
        logger.error(`🚨 ALERTA: Feature flag modificado en PRODUCCIÓN: ${key} = ${enabled}`);
      }

      res.status(200).json({
        success: true,
        message: `Feature flag '${key}' ${enabled ? 'activado' : 'desactivado'}`,
        flag: {
          key: flag.key,
          enabled: flag.enabled,
          updatedAt: flag.updatedAt
        }
      });
    } catch (error) {
      logger.error('Error al toggle feature flag', {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });

      res.status(500).json({
        success: false,
        error: 'Error al modificar feature flag'
      });
    }
  }
}

