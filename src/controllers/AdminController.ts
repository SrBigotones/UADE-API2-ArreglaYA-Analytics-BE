import { Request, Response } from 'express';
import { DataMigrationService } from '../services/DataMigrationService';
import { logger } from '../config/logger';

/**
 * Controller para operaciones administrativas
 * IMPORTANTE: Estos endpoints deben estar protegidos con autenticación
 */
export class AdminController {
  private migrationService: DataMigrationService;

  constructor() {
    this.migrationService = new DataMigrationService();
  }

  /**
   * POST /api/admin/migrate/all
   * Migra todos los eventos históricos a tablas normalizadas
   */
  public async migrateAllEvents(req: Request, res: Response): Promise<void> {
    try {
      const batchSize = req.body.batchSize || 1000;

      logger.info(`Iniciando migración completa de eventos (batchSize: ${batchSize})`);

      const result = await this.migrationService.migrateAllEvents(batchSize);

      res.status(200).json({
        success: true,
        message: 'Migración completada',
        result
      });

    } catch (error) {
      logger.error('Error en migración completa:', error);
      res.status(500).json({
        success: false,
        message: 'Error en migración',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/admin/migrate/from-date
   * Migra eventos desde una fecha específica
   */
  public async migrateFromDate(req: Request, res: Response): Promise<void> {
    try {
      const { fromDate, batchSize } = req.body;

      if (!fromDate) {
        res.status(400).json({
          success: false,
          message: 'fromDate es requerido (formato ISO)'
        });
        return;
      }

      const date = new Date(fromDate);
      if (isNaN(date.getTime())) {
        res.status(400).json({
          success: false,
          message: 'fromDate debe ser una fecha válida (formato ISO)'
        });
        return;
      }

      logger.info(`Iniciando migración desde fecha: ${date.toISOString()}`);

      const result = await this.migrationService.migrateEventsFromDate(
        date,
        batchSize || 1000
      );

      res.status(200).json({
        success: true,
        message: 'Migración completada',
        result
      });

    } catch (error) {
      logger.error('Error en migración desde fecha:', error);
      res.status(500).json({
        success: false,
        message: 'Error en migración',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/admin/migrate/unprocessed
   * Migra solo eventos no procesados
   */
  public async migrateUnprocessed(req: Request, res: Response): Promise<void> {
    try {
      const batchSize = req.body.batchSize || 1000;

      logger.info(`Iniciando migración de eventos no procesados (batchSize: ${batchSize})`);

      const result = await this.migrationService.migrateUnprocessedEvents(batchSize);

      res.status(200).json({
        success: true,
        message: 'Migración completada',
        result
      });

    } catch (error) {
      logger.error('Error en migración de eventos no procesados:', error);
      res.status(500).json({
        success: false,
        message: 'Error en migración',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

