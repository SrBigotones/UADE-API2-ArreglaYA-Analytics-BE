import { AppDataSource } from '../config/database';
import { FeatureFlag } from '../models/FeatureFlag';
import { logger } from '../config/logger';

export class FeatureFlagService {
  private get featureFlagRepository() {
    return AppDataSource.getRepository(FeatureFlag);
  }

  /**
   * Obtiene el valor de un feature flag
   */
  async isEnabled(key: string): Promise<boolean> {
    try {
      const flag = await this.featureFlagRepository.findOne({ where: { key } });
      
      // Si no existe el flag, crearlo como false por defecto
      if (!flag) {
        logger.warn(`Feature flag '${key}' not found, creating with default value: false`);
        await this.createFlag(key, false);
        return false;
      }

      return flag.enabled;
    } catch (error) {
      logger.error(`Error checking feature flag '${key}':`, error);
      // En caso de error, retornar false por seguridad
      return false;
    }
  }

  /**
   * Crea un nuevo feature flag
   */
  async createFlag(key: string, enabled: boolean = false): Promise<FeatureFlag> {
    try {
      const flag = this.featureFlagRepository.create({
        key,
        enabled
      });
      
      const savedFlag = await this.featureFlagRepository.save(flag);
      
      logger.info(`Feature flag created: ${key} = ${enabled}`);
      return savedFlag;
    } catch (error) {
      logger.error(`Error creating feature flag '${key}':`, error);
      throw error;
    }
  }

  /**
   * Actualiza el valor de un feature flag
   */
  async toggleFlag(key: string, enabled: boolean): Promise<FeatureFlag> {
    try {
      let flag = await this.featureFlagRepository.findOne({ where: { key } });
      
      // Si no existe, crearlo
      if (!flag) {
        return await this.createFlag(key, enabled);
      }

      // Actualizar valor
      flag.enabled = enabled;
      const updatedFlag = await this.featureFlagRepository.save(flag);
      
      logger.info(`Feature flag toggled: ${key} = ${enabled}`);
      return updatedFlag;
    } catch (error) {
      logger.error(`Error toggling feature flag '${key}':`, error);
      throw error;
    }
  }

  /**
   * Obtiene todos los feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    try {
      return await this.featureFlagRepository.find({
        order: { key: 'ASC' }
      });
    } catch (error) {
      logger.error('Error getting all feature flags:', error);
      throw error;
    }
  }

  /**
   * Elimina un feature flag
   */
  async deleteFlag(key: string): Promise<boolean> {
    try {
      const result = await this.featureFlagRepository.delete({ key });
      logger.info(`Feature flag deleted: ${key}`);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      logger.error(`Error deleting feature flag '${key}':`, error);
      throw error;
    }
  }
}

// Feature flags conocidos
export const FEATURE_FLAGS = {
  BYPASS_AUTH_SERVICE: 'bypass_auth_service', // Bypass del servicio de usuarios para auth (desactivado por defecto)
} as const;

export const featureFlagService = new FeatureFlagService();

