import { Request, Response } from 'express';
import { DataMigrationService } from '../services/DataMigrationService';
import { EventNormalizationService } from '../services/EventNormalizationService';
import { AppDataSource } from '../config/database';
import { Event } from '../models/Event';
import { logger } from '../config/logger';

/**
 * Controller para operaciones administrativas
 * IMPORTANTE: Estos endpoints deben estar protegidos con autenticación
 */
export class AdminController {
  private migrationService: DataMigrationService;
  private normalizationService: EventNormalizationService;

  constructor() {
    this.migrationService = new DataMigrationService();
    this.normalizationService = new EventNormalizationService();
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

  /**
   * POST /api/admin/reprocess-events
   * Reprocesa eventos que ya fueron guardados pero necesitan renormalización
   * Útil después de actualizar la lógica de normalización
   */
  public async reprocessEvents(req: Request, res: Response): Promise<void> {
    try {
      const { 
        eventType,     // 'user', 'payment', 'solicitud', etc.
        squad,         // Filtrar por squad específico
        limit = 100,   // Cantidad máxima de eventos a reprocesar
        markAsUnprocessed = false,  // Si true, solo marca como no procesados (para que el worker los procese)
        processedOnly = false  // Si true, solo reprocesa eventos ya procesados. Si false, reprocesa los NO procesados
      } = req.body;

      logger.info(`Iniciando reprocesamiento de eventos | type: ${eventType} | squad: ${squad} | limit: ${limit} | processedOnly: ${processedOnly}`);

      const eventRepository = AppDataSource.getRepository(Event);
      const queryBuilder = eventRepository.createQueryBuilder('event');

      // Filtros
      if (eventType) {
        queryBuilder.andWhere('LOWER(event.evento) LIKE :eventType', { 
          eventType: `%${eventType.toLowerCase()}%` 
        });
      }
      if (squad) {
        queryBuilder.andWhere('event.squad = :squad', { squad });
      }

      // Filtrar por estado de procesamiento
      if (processedOnly) {
        // Solo eventos que ya están marcados como procesados
        queryBuilder.andWhere('event.processed = :processed', { processed: true });
      } else {
        // Solo eventos que NO están procesados (los que fallaron)
        queryBuilder.andWhere('event.processed = :processed', { processed: false });
      }
      
      queryBuilder
        .orderBy('event.timestamp', 'DESC')
        .take(limit);

      const events = await queryBuilder.getMany();

      logger.info(`Encontrados ${events.length} eventos para reprocesar`);

      if (markAsUnprocessed) {
        // Solo marcar como no procesados
        for (const event of events) {
          event.processed = false;
          await eventRepository.save(event);
        }

        res.status(200).json({
          success: true,
          message: `${events.length} eventos marcados como no procesados`,
          eventsMarked: events.length
        });
        return;
      }

      // Reprocesar inmediatamente
      let successCount = 0;
      let errorCount = 0;
      const errors: any[] = [];

      for (const event of events) {
        try {
          // Marcar como no procesado
          event.processed = false;
          await eventRepository.save(event);

          // Renormalizar
          await this.normalizationService.normalizeEvent(event);

          // Marcar como procesado nuevamente
          event.processed = true;
          await eventRepository.save(event);

          successCount++;
        } catch (error) {
          errorCount++;
          errors.push({
            eventId: event.id,
            squad: event.squad,
            topico: event.topico,
            evento: event.evento,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          logger.error(`Error reprocesando evento ${event.id}:`, error);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Reprocesamiento completado',
        result: {
          total: events.length,
          success: successCount,
          errors: errorCount,
          errorDetails: errors.slice(0, 10) // Solo primeros 10 errores
        }
      });

    } catch (error) {
      logger.error('Error en reprocesamiento de eventos:', error);
      res.status(500).json({
        success: false,
        message: 'Error en reprocesamiento',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

