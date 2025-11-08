import { AppDataSource } from '../config/database';
import { Event } from '../models/Event';
import { EventNormalizationService } from './EventNormalizationService';
import { logger } from '../config/logger';

/**
 * Servicio para migrar datos históricos desde la tabla events
 * a las tablas normalizadas
 */
export class DataMigrationService {
  private normalizationService: EventNormalizationService;

  constructor() {
    this.normalizationService = new EventNormalizationService();
  }

  /**
   * Migra todos los eventos existentes a las tablas normalizadas
   * @param batchSize - Tamaño del lote para procesar (default: 1000)
   */
  public async migrateAllEvents(batchSize: number = 1000): Promise<{
    total: number;
    processed: number;
    errors: number;
  }> {
    try {
      logger.info('🔄 Iniciando migración de datos históricos...');

      const eventRepository = AppDataSource.getRepository(Event);
      
      // Contar total de eventos
      const total = await eventRepository.count();
      logger.info(`📊 Total de eventos a procesar: ${total}`);

      let processed = 0;
      let errors = 0;
      let offset = 0;

      while (offset < total) {
        // Obtener lote de eventos
        const events = await eventRepository.find({
          take: batchSize,
          skip: offset,
          order: {
            timestamp: 'ASC' // Procesar desde los más antiguos
          }
        });

        if (events.length === 0) {
          break;
        }

        logger.info(`📦 Procesando lote: ${offset + 1} - ${offset + events.length} de ${total}`);

        // Procesar cada evento del lote
        for (const event of events) {
          try {
            await this.normalizationService.normalizeEvent(event);
            processed++;
          } catch (error) {
            errors++;
            logger.warn(`Error procesando evento ${event.id}:`, error);
            // Continuar con el siguiente evento
          }
        }

        offset += batchSize;

        // Log de progreso cada 10 lotes
        if (Math.floor(offset / batchSize) % 10 === 0) {
          logger.info(`⏳ Progreso: ${processed} procesados, ${errors} errores`);
        }
      }

      logger.info(`✅ Migración completada: ${processed} procesados, ${errors} errores de ${total} total`);

      return {
        total,
        processed,
        errors
      };

    } catch (error) {
      logger.error('❌ Error en migración de datos:', error);
      throw error;
    }
  }

  /**
   * Migra eventos desde una fecha específica
   * @param fromDate - Fecha desde la cual migrar
   * @param batchSize - Tamaño del lote
   */
  public async migrateEventsFromDate(
    fromDate: Date,
    batchSize: number = 1000
  ): Promise<{
    total: number;
    processed: number;
    errors: number;
  }> {
    try {
      logger.info(`🔄 Iniciando migración desde fecha: ${fromDate.toISOString()}`);

      const eventRepository = AppDataSource.getRepository(Event);
      
      const queryBuilder = eventRepository
        .createQueryBuilder('event')
        .where('event.timestamp >= :fromDate', { fromDate });

      const total = await queryBuilder.getCount();
      logger.info(`📊 Total de eventos a procesar: ${total}`);

      let processed = 0;
      let errors = 0;
      let offset = 0;

      while (offset < total) {
        const events = await queryBuilder
          .take(batchSize)
          .skip(offset)
          .orderBy('event.timestamp', 'ASC')
          .getMany();

        if (events.length === 0) {
          break;
        }

        logger.info(`📦 Procesando lote: ${offset + 1} - ${offset + events.length} de ${total}`);

        for (const event of events) {
          try {
            await this.normalizationService.normalizeEvent(event);
            processed++;
          } catch (error) {
            errors++;
            logger.warn(`Error procesando evento ${event.id}:`, error);
          }
        }

        offset += batchSize;
      }

      logger.info(`✅ Migración completada: ${processed} procesados, ${errors} errores de ${total} total`);

      return {
        total,
        processed,
        errors
      };

    } catch (error) {
      logger.error('❌ Error en migración de datos:', error);
      throw error;
    }
  }

  /**
   * Migra solo eventos no procesados (processed = false)
   */
  public async migrateUnprocessedEvents(batchSize: number = 1000): Promise<{
    total: number;
    processed: number;
    errors: number;
  }> {
    try {
      logger.info('🔄 Iniciando migración de eventos no procesados...');

      const eventRepository = AppDataSource.getRepository(Event);
      
      const queryBuilder = eventRepository
        .createQueryBuilder('event')
        .where('event.processed = :processed', { processed: false });

      const total = await queryBuilder.getCount();
      logger.info(`📊 Total de eventos no procesados: ${total}`);

      let processed = 0;
      let errors = 0;
      let offset = 0;

      while (offset < total) {
        const events = await queryBuilder
          .take(batchSize)
          .skip(offset)
          .orderBy('event.timestamp', 'ASC')
          .getMany();

        if (events.length === 0) {
          break;
        }

        logger.info(`📦 Procesando lote: ${offset + 1} - ${offset + events.length} de ${total}`);

        for (const event of events) {
          try {
            await this.normalizationService.normalizeEvent(event);
            processed++;
            
            // Marcar como procesado
            event.processed = true;
            await eventRepository.save(event);
          } catch (error) {
            errors++;
            logger.warn(`Error procesando evento ${event.id}:`, error);
          }
        }

        offset += batchSize;
      }

      logger.info(`✅ Migración completada: ${processed} procesados, ${errors} errores de ${total} total`);

      return {
        total,
        processed,
        errors
      };

    } catch (error) {
      logger.error('❌ Error en migración de datos:', error);
      throw error;
    }
  }
}

