import { AppDataSource } from '../config/database';
import { Usuario } from '../models/Usuario';
import { Servicio } from '../models/Servicio';
import { Solicitud } from '../models/Solicitud';
import { Cotizacion } from '../models/Cotizacion';
import { Pago } from '../models/Pago';
import { Habilidad } from '../models/Habilidad';
import { Zona } from '../models/Zona';
import { Prestador } from '../models/Prestador';
import { Rubro } from '../models/Rubro';
import { CardMetricResponse, PieMetricResponse, DateRangeFilter, PeriodType } from '../types';
import { logger } from '../config/logger';
import { DateRangeService } from './DateRangeService';

/**
 * Clase base para cálculos de métricas usando tablas normalizadas
 */
export class BaseMetricsCalculator {
  /**
   * Calcula una métrica tipo card con comparación de período anterior
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
   * Genera intervalos de tiempo según el período seleccionado
   * @param periodType Tipo de período
   * @param dateRanges Rangos de fechas
   * @returns Array de intervalos { start: Date, end: Date, label: string }
   */
  protected generateTimeIntervals(
    periodType: PeriodType,
    dateRanges: DateRangeFilter
  ): Array<{ start: Date; end: Date; label: string; date: string }> {
    const intervals: Array<{ start: Date; end: Date; label: string; date: string }> = [];
    let current: Date;
    let intervalDuration: number = 0; // Inicializado por defecto
    let formatLabel: (date: Date) => string;
    let nextDate: (date: Date) => Date;

    switch (periodType.type) {
      case 'hoy':
        // Por hora (24 puntos)
        current = new Date(dateRanges.startDate);
        intervalDuration = 60 * 60 * 1000; // 1 hora en milisegundos
        formatLabel = (d) => `${d.getHours().toString().padStart(2, '0')}:00`;
        nextDate = (d) => {
          const next = new Date(d);
          next.setHours(next.getHours() + 1);
          return next;
        };
        break;

      case 'ultimos_7_dias':
        // Por día (7 puntos)
        current = new Date(dateRanges.startDate);
        intervalDuration = 24 * 60 * 60 * 1000; // 1 día
        formatLabel = (d) => {
          const day = d.getDate();
          const month = d.getMonth() + 1;
          return `${day}/${month}`;
        };
        nextDate = (d) => {
          const next = new Date(d);
          next.setDate(next.getDate() + 1);
          return next;
        };
        break;

      case 'ultimos_30_dias':
        // Por semana (4-5 puntos)
        current = new Date(dateRanges.startDate);
        intervalDuration = 7 * 24 * 60 * 60 * 1000; // 1 semana
        formatLabel = (d) => {
          const day = d.getDate();
          const month = d.getMonth() + 1;
          return `Sem ${day}/${month}`;
        };
        nextDate = (d) => {
          const next = new Date(d);
          next.setDate(next.getDate() + 7);
          return next;
        };
        break;

      case 'ultimo_ano':
        // Por mes (12 puntos)
        current = new Date(dateRanges.startDate.getFullYear(), dateRanges.startDate.getMonth(), 1);
        formatLabel = (d) => {
          const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          return months[d.getMonth()];
        };
        nextDate = (d) => {
          const next = new Date(d);
          next.setMonth(next.getMonth() + 1);
          return next;
        };
        break;

      default:
        // Para períodos personalizados, usar días si son menos de 90 días, sino semanas
        const daysDiff = Math.ceil((dateRanges.endDate.getTime() - dateRanges.startDate.getTime()) / (24 * 60 * 60 * 1000));
        if (daysDiff <= 30) {
          current = new Date(dateRanges.startDate);
          intervalDuration = 24 * 60 * 60 * 1000; // 1 día
          formatLabel = (d) => {
            const day = d.getDate();
            const month = d.getMonth() + 1;
            return `${day}/${month}`;
          };
          nextDate = (d) => {
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            return next;
          };
        } else {
          current = new Date(dateRanges.startDate);
          intervalDuration = 7 * 24 * 60 * 60 * 1000; // 1 semana
          formatLabel = (d) => {
            const day = d.getDate();
            const month = d.getMonth() + 1;
            return `Sem ${day}/${month}`;
          };
          nextDate = (d) => {
            const next = new Date(d);
            next.setDate(next.getDate() + 7);
            return next;
          };
        }
        break;
    }

    while (current <= dateRanges.endDate) {
      let intervalEnd: Date;
      if (periodType.type === 'ultimo_ano') {
        intervalEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
      } else {
        intervalEnd = new Date(Math.min(current.getTime() + intervalDuration - 1, dateRanges.endDate.getTime()));
      }
      
      intervals.push({
        start: new Date(current),
        end: intervalEnd,
        label: formatLabel(current),
        date: current.toISOString().split('T')[0]
      });

      current = nextDate(current);
      if (current > dateRanges.endDate) break;
    }

    return intervals;
  }

  /**
   * Calcula datos históricos para gráficos de línea
   * @param periodType Tipo de período
   * @param dateRanges Rangos de fechas
   * @param calculateValue Función que calcula el valor para un intervalo
   * @returns Array de datos para el gráfico { date: string, value: number }
   */
  protected async calculateHistoricalData(
    periodType: PeriodType,
    dateRanges: DateRangeFilter,
    calculateValue: (start: Date, end: Date) => Promise<number>
  ): Promise<Array<{ date: string; value: number }>> {
    const intervals = this.generateTimeIntervals(periodType, dateRanges);
    const historicalData: Array<{ date: string; value: number }> = [];

    for (const interval of intervals) {
      try {
        const value = await calculateValue(interval.start, interval.end);
        const numericValue = typeof value === 'number' && !isNaN(value) ? value : 0;
        historicalData.push({
          date: interval.label || interval.date,
          value: Math.round(numericValue * 100) / 100
        });
      } catch (error) {
        logger.error(`Error calculating historical value for interval ${interval.label}:`, error);
        historicalData.push({
          date: interval.label || interval.date,
          value: 0
        });
      }
    }

    return historicalData;
  }

  // ========== MÉTODOS PARA USUARIOS ==========
  
  protected async countUsuarios(startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Usuario);
    return await repo
      .createQueryBuilder('usuario')
      .where('usuario.timestamp >= :startDate', { startDate })
      .andWhere('usuario.timestamp <= :endDate', { endDate })
      .getCount();
  }

  protected async countUsuariosByRol(rol: string, startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Usuario);
    const result = await repo
      .createQueryBuilder('usuario')
      .where('usuario.rol = :rol', { rol })
      .andWhere('usuario.timestamp >= :startDate', { startDate })
      .andWhere('usuario.timestamp <= :endDate', { endDate })
      .getCount();
    return result;
  }

  // ========== MÉTODOS PARA SOLICITUDES ==========
  
  protected async countSolicitudes(startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Solicitud);
    return await repo
      .createQueryBuilder('solicitud')
      .where('solicitud.timestamp >= :startDate', { startDate })
      .andWhere('solicitud.timestamp <= :endDate', { endDate })
      .getCount();
  }

  protected async countSolicitudesByEstado(estado: string, startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Solicitud);
    return await repo
      .createQueryBuilder('solicitud')
      .where('solicitud.estado = :estado', { estado })
      .andWhere('solicitud.timestamp >= :startDate', { startDate })
      .andWhere('solicitud.timestamp <= :endDate', { endDate })
      .getCount();
  }

  protected async getSolicitudes(startDate: Date, endDate: Date) {
    const repo = AppDataSource.getRepository(Solicitud);
    return await repo
      .createQueryBuilder('solicitud')
      .where('solicitud.timestamp >= :startDate', { startDate })
      .andWhere('solicitud.timestamp <= :endDate', { endDate })
      .getMany();
  }

  // ========== MÉTODOS PARA COTIZACIONES ==========
  
  protected async countCotizaciones(startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Cotizacion);
    return await repo
      .createQueryBuilder('cotizacion')
      .where('cotizacion.timestamp >= :startDate', { startDate })
      .andWhere('cotizacion.timestamp <= :endDate', { endDate })
      .getCount();
  }

  protected async countCotizacionesByEstado(estado: string, startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Cotizacion);
    return await repo
      .createQueryBuilder('cotizacion')
      .where('cotizacion.estado = :estado', { estado })
      .andWhere('cotizacion.timestamp >= :startDate', { startDate })
      .andWhere('cotizacion.timestamp <= :endDate', { endDate })
      .getCount();
  }

  protected async getCotizaciones(startDate: Date, endDate: Date) {
    const repo = AppDataSource.getRepository(Cotizacion);
    return await repo
      .createQueryBuilder('cotizacion')
      .where('cotizacion.timestamp >= :startDate', { startDate })
      .andWhere('cotizacion.timestamp <= :endDate', { endDate })
      .getMany();
  }

  protected async getCotizacionBySolicitud(idSolicitud: number): Promise<Cotizacion | null> {
    const repo = AppDataSource.getRepository(Cotizacion);
    return await repo.findOne({
      where: { id_solicitud: idSolicitud },
      order: { timestamp: 'ASC' }
    });
  }

  // ========== MÉTODOS PARA PAGOS ==========
  
  protected async countPagos(startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Pago);
    return await repo
      .createQueryBuilder('pago')
      .where('pago.timestamp_creado >= :startDate', { startDate })
      .andWhere('pago.timestamp_creado <= :endDate', { endDate })
      .getCount();
  }

  protected async countPagosByEstado(estado: string, startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Pago);
    return await repo
      .createQueryBuilder('pago')
      .where('pago.estado = :estado', { estado })
      .andWhere('pago.timestamp_creado >= :startDate', { startDate })
      .andWhere('pago.timestamp_creado <= :endDate', { endDate })
      .getCount();
  }

  protected async getPagos(startDate: Date, endDate: Date) {
    const repo = AppDataSource.getRepository(Pago);
    return await repo
      .createQueryBuilder('pago')
      .where('pago.timestamp_creado >= :startDate', { startDate })
      .andWhere('pago.timestamp_creado <= :endDate', { endDate })
      .getMany();
  }

  protected async getPagosAprobados(startDate: Date, endDate: Date) {
    const repo = AppDataSource.getRepository(Pago);
    return await repo
      .createQueryBuilder('pago')
      .where('pago.estado = :estado', { estado: 'approved' })
      .andWhere('pago.timestamp_creado >= :startDate', { startDate })
      .andWhere('pago.timestamp_creado <= :endDate', { endDate })
      .getMany();
  }

  protected async sumMontoPagosAprobados(startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Pago);
    const result = await repo
      .createQueryBuilder('pago')
      .select('COALESCE(SUM(pago.monto_total), 0)', 'total')
      .where('pago.estado = :estado', { estado: 'approved' })
      .andWhere('pago.timestamp_creado >= :startDate', { startDate })
      .andWhere('pago.timestamp_creado <= :endDate', { endDate })
      .getRawOne();
    return parseFloat(result?.total || '0');
  }

  protected async calculateAverageProcessingTimePagos(startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Pago);
    const result = await repo
      .createQueryBuilder('pago')
      .select('AVG(EXTRACT(EPOCH FROM (pago.captured_at - pago.timestamp_creado)) / 60)', 'avg_minutes')
      .where('pago.estado = :estado', { estado: 'approved' })
      .andWhere('pago.timestamp_creado >= :startDate', { startDate })
      .andWhere('pago.timestamp_creado <= :endDate', { endDate })
      .andWhere('pago.captured_at IS NOT NULL')
      .getRawOne();
    return Math.round((parseFloat(result?.avg_minutes || '0')) * 100) / 100;
  }

  // ========== MÉTODOS PARA CÁLCULOS DE TIEMPO ==========
  
  protected async calculateAverageTimeToFirstQuote(startDate: Date, endDate: Date): Promise<number> {
    const solicitudesRepo = AppDataSource.getRepository(Solicitud);
    const cotizacionesRepo = AppDataSource.getRepository(Cotizacion);
    
    const solicitudes = await solicitudesRepo
      .createQueryBuilder('solicitud')
      .where('solicitud.timestamp >= :startDate', { startDate })
      .andWhere('solicitud.timestamp <= :endDate', { endDate })
      .getMany();

    const tiempos: number[] = [];

    for (const solicitud of solicitudes) {
      const primeraCotizacion = await cotizacionesRepo
        .createQueryBuilder('cotizacion')
        .where('cotizacion.id_solicitud = :idSolicitud', { idSolicitud: solicitud.id_solicitud })
        .andWhere('cotizacion.estado = :estado', { estado: 'emitida' })
        .orderBy('cotizacion.timestamp', 'ASC')
        .getOne();

      if (primeraCotizacion) {
        const diffMs = primeraCotizacion.timestamp.getTime() - solicitud.timestamp.getTime();
        const diffHoras = diffMs / (1000 * 60 * 60);
        tiempos.push(diffHoras);
      }
    }

    if (tiempos.length === 0) return 0;
    const promedio = tiempos.reduce((sum, t) => sum + t, 0) / tiempos.length;
    return Math.round(promedio * 100) / 100;
  }

  protected async calculateAverageMatchingTime(startDate: Date, endDate: Date): Promise<number> {
    // Matching completado es cuando se asigna un prestador a una solicitud
    // Esto se refleja cuando id_prestador se asigna en solicitud
    const repo = AppDataSource.getRepository(Solicitud);
    const result = await repo
      .createQueryBuilder('solicitud')
      .where('solicitud.id_prestador IS NOT NULL')
      .andWhere('solicitud.timestamp >= :startDate', { startDate })
      .andWhere('solicitud.timestamp <= :endDate', { endDate })
      .getMany();

    // El tiempo de matching sería 0 para solicitudes que ya vienen con prestador asignado
    // O podríamos calcular la diferencia entre cuando se creó y cuando se asignó el prestador
    // Por ahora retornamos 0 ya que no tenemos el evento de matching explícito
    return 0;
  }

  protected async calculateAverageProviderResponseTime(startDate: Date, endDate: Date): Promise<number> {
    const solicitudesRepo = AppDataSource.getRepository(Solicitud);
    const cotizacionesRepo = AppDataSource.getRepository(Cotizacion);
    
    const solicitudes = await solicitudesRepo
      .createQueryBuilder('solicitud')
      .where('solicitud.timestamp >= :startDate', { startDate })
      .andWhere('solicitud.timestamp <= :endDate', { endDate })
      .getMany();

    const tiempos: number[] = [];

    for (const solicitud of solicitudes) {
      if (solicitud.id_prestador) {
        const cotizacion = await cotizacionesRepo
          .createQueryBuilder('cotizacion')
          .where('cotizacion.id_solicitud = :idSolicitud', { idSolicitud: solicitud.id_solicitud })
          .andWhere('cotizacion.id_prestador = :idPrestador', { idPrestador: solicitud.id_prestador })
          .andWhere('cotizacion.estado = :estado', { estado: 'emitida' })
          .orderBy('cotizacion.timestamp', 'ASC')
          .getOne();

        if (cotizacion) {
          const diffMs = cotizacion.timestamp.getTime() - solicitud.timestamp.getTime();
          const diffMinutos = diffMs / (1000 * 60);
          tiempos.push(diffMinutos);
        }
      }
    }

    if (tiempos.length === 0) return 0;
    const promedio = tiempos.reduce((sum, t) => sum + t, 0) / tiempos.length;
    return Math.round(promedio * 100) / 100;
  }

  // ========== MÉTODOS PARA PRESTADORES ==========
  
  protected async countPrestadoresByEstado(estado: string, startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Prestador);
    return await repo
      .createQueryBuilder('prestador')
      .where('prestador.estado = :estado', { estado })
      .andWhere('prestador.timestamp >= :startDate', { startDate })
      .andWhere('prestador.timestamp <= :endDate', { endDate })
      .getCount();
  }

  protected async countPrestadoresActivos(): Promise<number> {
    const repo = AppDataSource.getRepository(Prestador);
    return await repo
      .createQueryBuilder('prestador')
      .where('prestador.estado = :estado', { estado: 'activo' })
      .getCount();
  }

  protected async countPrestadoresConPerfilCompleto(): Promise<number> {
    const repo = AppDataSource.getRepository(Prestador);
    return await repo
      .createQueryBuilder('prestador')
      .where('prestador.perfil_completo = :completo', { completo: true })
      .andWhere('prestador.estado = :estado', { estado: 'activo' })
      .getCount();
  }

  protected async countModificacionesPrestadores(startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Prestador);
    // Contar actualizaciones basándose en updated_at diferente de created_at
    return await repo
      .createQueryBuilder('prestador')
      .where('prestador.updated_at >= :startDate', { startDate })
      .andWhere('prestador.updated_at <= :endDate', { endDate })
      .andWhere('prestador.updated_at != prestador.created_at')
      .getCount();
  }

  // ========== MÉTODOS PARA RUBROS ==========
  
  protected async getRubros(): Promise<Rubro[]> {
    const repo = AppDataSource.getRepository(Rubro);
    return await repo.find();
  }

  // ========== MÉTODOS PARA WIN RATE ==========
  
  protected async countCotizacionesEmitidasPorPrestador(idPrestador: number, startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Cotizacion);
    return await repo
      .createQueryBuilder('cotizacion')
      .where('cotizacion.id_prestador = :idPrestador', { idPrestador })
      .andWhere('cotizacion.timestamp >= :startDate', { startDate })
      .andWhere('cotizacion.timestamp <= :endDate', { endDate })
      .getCount();
  }

  protected async countCotizacionesAceptadasPorPrestador(idPrestador: number, startDate: Date, endDate: Date): Promise<number> {
    const repo = AppDataSource.getRepository(Cotizacion);
    return await repo
      .createQueryBuilder('cotizacion')
      .where('cotizacion.id_prestador = :idPrestador', { idPrestador })
      .andWhere('cotizacion.estado = :estado', { estado: 'aceptada' })
      .andWhere('cotizacion.timestamp >= :startDate', { startDate })
      .andWhere('cotizacion.timestamp <= :endDate', { endDate })
      .getCount();
  }

  // ========== MÉTODOS PARA SOLICITUDES POR ZONA/RUBRO ==========
  
  protected async countSolicitudesPorZona(startDate: Date, endDate: Date): Promise<Array<{ zona: string; count: number }>> {
    const repo = AppDataSource.getRepository(Solicitud);
    const result = await repo
      .createQueryBuilder('solicitud')
      .select('solicitud.zona', 'zona')
      .addSelect('COUNT(*)', 'count')
      .where('solicitud.timestamp >= :startDate', { startDate })
      .andWhere('solicitud.timestamp <= :endDate', { endDate })
      .andWhere('solicitud.zona IS NOT NULL')
      .groupBy('solicitud.zona')
      .getRawMany();

    return result.map(row => ({
      zona: row.zona,
      count: parseInt(row.count)
    }));
  }

  protected async getSolicitudesConCoordenadas(startDate: Date, endDate: Date): Promise<Array<{ lat: number; lon: number }>> {
    const repo = AppDataSource.getRepository(Solicitud);
    // Asumimos que las solicitudes pueden tener coordenadas, si no están en la tabla, usar zonas
    const solicitudes = await repo
      .createQueryBuilder('solicitud')
      .where('solicitud.timestamp >= :startDate', { startDate })
      .andWhere('solicitud.timestamp <= :endDate', { endDate })
      .getMany();

    // Si no hay coordenadas directas, usar las zonas para mapear (esto requeriría una tabla de zonas con coordenadas)
    // Por ahora retornamos array vacío y se puede implementar después
    return [];
  }
}
