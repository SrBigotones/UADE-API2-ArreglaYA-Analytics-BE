import { Request, Response } from 'express';
import { MigrationService } from '../services/MigrationService';
import { logger } from '../config/logger';
import { AppDataSource } from '../config/database';

export class HealthController {
  private migrationService: MigrationService;

  constructor() {
    this.migrationService = new MigrationService();
  }

  /**
   * Health check básico
   */
  public async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Verificar conexión a base de datos
      const dbStatus = AppDataSource?.isInitialized ? 'connected' : 'disconnected';
      
      // Obtener información de migraciones
      const migrationInfo = await this.migrationService.getMigrationInfo();

      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: {
          status: dbStatus,
          migrations: migrationInfo
        },
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      });

    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
