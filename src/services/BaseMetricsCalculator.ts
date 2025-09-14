import { AppDataSource } from '../config/database';
import { Event } from '../models/Event';
import { CardMetricResponse, PieMetricResponse, DateRangeFilter } from '../types';
import { logger } from '../config/logger';

export class BaseMetricsCalculator {
  private get eventRepository() {
    return AppDataSource.getRepository(Event);
  }

  /**
   * Calcula una métrica tipo card con comparación de período anterior
   * @param currentValue - Valor del período actual
   * @param previousValue - Valor del período anterior
   * @param changeType - Tipo de cambio (porcentaje o absoluto)
   * @returns Respuesta formateada para métrica tipo card
   */
  protected calculateCardMetric(
    currentValue: number, 
    previousValue: number, 
    changeType: 'porcentaje' | 'absoluto' = 'porcentaje'
  ): CardMetricResponse {
    let change: number;
    let changeStatus: 'positivo' | 'negativo';

    if (changeType === 'porcentaje') {
      if (previousValue === 0) {
        change = currentValue > 0 ? 100 : 0;
      } else {
        change = Math.round(((currentValue - previousValue) / previousValue) * 100);
      }
    } else {
      change = currentValue - previousValue;
    }

    changeStatus = change >= 0 ? 'positivo' : 'negativo';

    return {
      value: currentValue,
      change: Math.abs(change),
      changeType,
      changeStatus
    };
  }

  /**
   * Cuenta eventos por tipo en un rango de fechas
   * @param eventType - Tipo de evento a contar
   * @param startDate - Fecha de inicio
   * @param endDate - Fecha de fin
   * @returns Número de eventos
   */
  protected async countEventsByType(
    eventType: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<number> {
    try {
      const count = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.evento = :eventType', { eventType })
        .andWhere('event.timestamp >= :startDate', { startDate })
        .andWhere('event.timestamp <= :endDate', { endDate })
        .getCount();

      return count;
    } catch (error) {
      logger.error(`Error counting events by type ${eventType}:`, error);
      return 0;
    }
  }

  /**
   * Obtiene eventos por tipo en un rango de fechas
   * @param eventType - Tipo de evento
   * @param startDate - Fecha de inicio
   * @param endDate - Fecha de fin
   * @returns Lista de eventos
   */
  protected async getEventsByType(
    eventType: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Event[]> {
    try {
      const events = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.evento = :eventType', { eventType })
        .andWhere('event.timestamp >= :startDate', { startDate })
        .andWhere('event.timestamp <= :endDate', { endDate })
        .orderBy('event.timestamp', 'ASC')
        .getMany();

      return events;
    } catch (error) {
      logger.error(`Error getting events by type ${eventType}:`, error);
      return [];
    }
  }

  /**
   * Obtiene eventos por correlationId
   * @param correlationId - ID de correlación
   * @returns Lista de eventos relacionados
   */
  protected async getEventsByCorrelationId(correlationId: string): Promise<Event[]> {
    try {
      const events = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.correlationId = :correlationId', { correlationId })
        .orderBy('event.timestamp', 'ASC')
        .getMany();

      return events;
    } catch (error) {
      logger.error(`Error getting events by correlationId ${correlationId}:`, error);
      return [];
    }
  }

  /**
   * Calcula la diferencia promedio en minutos entre dos tipos de eventos
   * @param createdEvents - Eventos de creación
   * @param completedEvents - Eventos de finalización
   * @returns Promedio de tiempo en minutos
   */
  protected calculateAverageProcessingTime(
    createdEvents: Event[], 
    completedEvents: Event[]
  ): number {
    if (createdEvents.length === 0 || completedEvents.length === 0) {
      return 0;
    }

    const processingTimes: number[] = [];

    for (const completedEvent of completedEvents) {
      if (completedEvent.correlationId) {
        const createdEvent = createdEvents.find(
          e => e.correlationId === completedEvent.correlationId
        );

        if (createdEvent) {
          const timeDiff = completedEvent.timestamp.getTime() - createdEvent.timestamp.getTime();
          const minutesDiff = timeDiff / (1000 * 60); // Convertir a minutos
          processingTimes.push(minutesDiff);
        }
      }
    }

    if (processingTimes.length === 0) {
      return 0;
    }

    const average = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
    return Math.round(average * 100) / 100; // Redondear a 2 decimales
  }

  /**
   * Filtra eventos que tienen su ciclo completo dentro del período
   * @param createdEvents - Eventos de creación
   * @param completedEvents - Eventos de finalización
   * @param periodStart - Inicio del período
   * @param periodEnd - Fin del período
   * @returns Eventos que completaron su ciclo en el período
   */
  protected getCompleteLifecycleEvents(
    createdEvents: Event[],
    completedEvents: Event[],
    periodStart: Date,
    periodEnd: Date
  ): { created: Event[], completed: Event[] } {
    const validCompleted: Event[] = [];
    const validCreated: Event[] = [];

    for (const completedEvent of completedEvents) {
      if (completedEvent.correlationId) {
        const createdEvent = createdEvents.find(
          e => e.correlationId === completedEvent.correlationId
        );

        if (createdEvent && 
            createdEvent.timestamp >= periodStart && 
            createdEvent.timestamp <= periodEnd) {
          validCompleted.push(completedEvent);
          validCreated.push(createdEvent);
        }
      }
    }

    return { created: validCreated, completed: validCompleted };
  }

  /**
   * Calcula métricas tipo card para un evento específico
   * @param eventType - Tipo de evento
   * @param dateRanges - Rangos de fechas actual y anterior
   * @param changeType - Tipo de cambio
   * @returns Métrica tipo card
   */
  public async calculateSimpleCardMetric(
    eventType: string,
    dateRanges: DateRangeFilter,
    changeType: 'porcentaje' | 'absoluto' = 'porcentaje'
  ): Promise<CardMetricResponse> {
    const currentValue = await this.countEventsByType(
      eventType, 
      dateRanges.startDate, 
      dateRanges.endDate
    );

    const previousValue = await this.countEventsByType(
      eventType, 
      dateRanges.previousStartDate, 
      dateRanges.previousEndDate
    );

    return this.calculateCardMetric(currentValue, previousValue, changeType);
  }
}
