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
import { CardMetricResponse, PieMetricResponse, DateRangeFilter, PeriodType, SegmentationFilters } from '../types';
import { logger } from '../config/logger';
import { DateRangeService } from './DateRangeService';

/**
 * Clase base para cálculos de métricas usando tablas normalizadas
 */
export class BaseMetricsCalculator {
  /**
   * Procesa distribuciones para gráficos de torta limitando a Top N categorías
   * Estrategia híbrida: Top N con umbral mínimo de porcentaje
   * 
   * @param rawDistribution Objeto con la distribución raw { categoria: count }
   * @param options Opciones de configuración
   * @returns Distribución procesada con categorías principales + "Otros"
   */
  protected processTopNDistribution(
    rawDistribution: Record<string, number>,
    options: {
      topN?: number;           // Número máximo de categorías a mostrar (default: 12)
      minPercentage?: number;  // Porcentaje mínimo para mostrar (default: 1.5%)
      othersLabel?: string;    // Etiqueta para categorías agrupadas (default: "Otros")
    } = {}
  ): PieMetricResponse {
    const { 
      topN = 10, 
      minPercentage = 1.5, 
      othersLabel = 'Otros' 
    } = options;

    // Convertir a array y ordenar por count descendente
    const entries = Object.entries(rawDistribution)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);

    // Calcular total
    const total = entries.reduce((sum, entry) => sum + entry.value, 0);

    // Si no hay datos, retornar vacío
    if (total === 0) {
      return {};
    }

    const result: PieMetricResponse = {};
    let othersCount = 0;

    entries.forEach((entry, index) => {
      const percentage = (entry.value / total) * 100;
      
      // Mostrar si está en el Top N Y supera el umbral mínimo
      if (index < topN && percentage >= minPercentage) {
        result[entry.key] = entry.value;
      } else {
        othersCount += entry.value;
      }
    });

    // Agregar "Otros" si hay categorías agrupadas
    if (othersCount > 0) {
      result[othersLabel] = othersCount;
    }

    return result;
  }

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
      // Redondear a 2 decimales para evitar errores de precisión de punto flotante
      change = Math.round((currentValue - previousValue) * 100) / 100;
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

  protected async countSolicitudesByEstado(estado: string, startDate: Date, endDate: Date, filters?: SegmentationFilters): Promise<number> {
    const repo = AppDataSource.getRepository(Solicitud);
    const qb = repo
      .createQueryBuilder('solicitud')
      .where('solicitud.estado = :estado', { estado })
      .andWhere('solicitud.timestamp >= :startDate', { startDate })
      .andWhere('solicitud.timestamp <= :endDate', { endDate });
    
    this.applySolicitudFilters(qb, filters);
    
    // Usar COUNT(DISTINCT) cuando hay filtros de rubro (para evitar duplicados por múltiples habilidades)
    if (filters?.rubro) {
      const result = await qb.select('COUNT(DISTINCT solicitud.id)', 'count').getRawOne();
      return parseInt(result?.count || '0');
    }
    
    return await qb.getCount();
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
  
  protected async countCotizaciones(startDate: Date, endDate: Date, filters?: SegmentationFilters): Promise<number> {
    const repo = AppDataSource.getRepository(Cotizacion);
    const qb = repo
      .createQueryBuilder('cotizacion')
      .where('cotizacion.timestamp >= :startDate', { startDate })
      .andWhere('cotizacion.timestamp <= :endDate', { endDate });
    
    this.applyCotizacionFilters(qb, filters);
    return await qb.getCount();
  }

  protected async countCotizacionesByEstado(estado: string, startDate: Date, endDate: Date, filters?: SegmentationFilters): Promise<number> {
    const repo = AppDataSource.getRepository(Cotizacion);
    const qb = repo
      .createQueryBuilder('cotizacion')
      .where('cotizacion.estado = :estado', { estado })
      .andWhere('cotizacion.timestamp >= :startDate', { startDate })
      .andWhere('cotizacion.timestamp <= :endDate', { endDate });
    
    this.applyCotizacionFilters(qb, filters);
    
    // Usar COUNT(DISTINCT) cuando hay filtros de rubro (para evitar duplicados por múltiples habilidades)
    if (filters?.rubro) {
      const result = await qb.select('COUNT(DISTINCT cotizacion.id)', 'count').getRawOne();
      return parseInt(result?.count || '0');
    }
    
    return await qb.getCount();
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

  protected async countPagosByEstado(estado: string, startDate: Date, endDate: Date, filters?: SegmentationFilters): Promise<number> {
    const repo = AppDataSource.getRepository(Pago);
    const qb = repo
      .createQueryBuilder('pago')
      .where('pago.estado = :estado', { estado })
      .andWhere('pago.timestamp_creado >= :startDate', { startDate })
      .andWhere('pago.timestamp_creado <= :endDate', { endDate });
    
    this.applyPagoFilters(qb, filters);
    
    // Usar COUNT(DISTINCT) cuando hay filtros de rubro (para evitar duplicados por múltiples habilidades)
    if (filters?.rubro) {
      const result = await qb.select('COUNT(DISTINCT pago.id)', 'count').getRawOne();
      return parseInt(result?.count || '0');
    }
    
    return await qb.getCount();
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

  protected async sumMontoPagosAprobados(startDate: Date, endDate: Date, filters?: SegmentationFilters): Promise<number> {
    const repo = AppDataSource.getRepository(Pago);
    const qb = repo
      .createQueryBuilder('pago')
      .select('COALESCE(SUM(pago.monto_total), 0)', 'total')
      .where('pago.estado = :estado', { estado: 'approved' })
      .andWhere('pago.timestamp_creado >= :startDate', { startDate })
      .andWhere('pago.timestamp_creado <= :endDate', { endDate });
    
    this.applyPagoFilters(qb, filters);
    const result = await qb.getRawOne();
    const total = parseFloat(result?.total || '0');
    // Redondear montos a 2 decimales
    return Math.round(total * 100) / 100;
  }

  protected async calculateAverageProcessingTimePagos(startDate: Date, endDate: Date, filters?: SegmentationFilters): Promise<number> {
    const repo = AppDataSource.getRepository(Pago);
    const qb = repo
      .createQueryBuilder('pago')
      // Calcular el tiempo entre creación y captura, filtrando casos donde captured_at < timestamp_creado
      // (que pueden ocurrir si los eventos llegan fuera de orden)
      .select('AVG(EXTRACT(EPOCH FROM (pago.captured_at - pago.timestamp_creado)) / 60)', 'avg_minutes')
      .where('pago.estado = :estado', { estado: 'approved' })
      .andWhere('pago.timestamp_creado >= :startDate', { startDate })
      .andWhere('pago.timestamp_creado <= :endDate', { endDate })
      .andWhere('pago.captured_at IS NOT NULL')
      .andWhere('pago.captured_at >= pago.timestamp_creado'); // Solo tiempos positivos (eventos en orden correcto)
    
    this.applyPagoFilters(qb, filters);
    const result = await qb.getRawOne();
    const avgMinutes = parseFloat(result?.avg_minutes || '0');
    // Si el resultado es negativo (no debería pasar con el filtro), devolver 0
    return avgMinutes >= 0 ? Math.round(avgMinutes * 100) / 100 : 0;
  }

  // ========== MÉTODOS PARA CÁLCULOS DE TIEMPO ==========
  
  protected async calculateAverageTimeToFirstQuote(startDate: Date, endDate: Date, filters?: SegmentationFilters): Promise<number> {
    const solicitudesRepo = AppDataSource.getRepository(Solicitud);
    const cotizacionesRepo = AppDataSource.getRepository(Cotizacion);
    
    // Obtener solicitudes con filtros (solo las que están en el rango de fechas)
    const qb = solicitudesRepo
      .createQueryBuilder('solicitud')
      .where('solicitud.timestamp >= :startDate', { startDate })
      .andWhere('solicitud.timestamp <= :endDate', { endDate });
    
    this.applySolicitudFilters(qb, filters);
    const solicitudes = await qb.getMany();

    if (solicitudes.length === 0) return 0;

    const tiempos: number[] = [];

    // Obtener todas las primeras cotizaciones (sin filtrar por fecha de cotización)
    // La primera cotización puede ser de cualquier fecha, solo importa que sea la primera
    const idsSolicitudes = solicitudes.map(s => s.id_solicitud);
    if (idsSolicitudes.length === 0) return 0;

    const primerasCotizaciones = await cotizacionesRepo
      .createQueryBuilder('cotizacion')
      .where('cotizacion.id_solicitud IN (:...ids)', { ids: idsSolicitudes })
      .select('cotizacion.id_solicitud', 'id_solicitud')
      .addSelect('MIN(cotizacion.timestamp)', 'primer_timestamp')
      .groupBy('cotizacion.id_solicitud')
      .getRawMany();

    // Crear un mapa de solicitud -> primera cotización
    const cotizacionesMap = new Map<number, Date>();
    primerasCotizaciones.forEach(c => {
      cotizacionesMap.set(c.id_solicitud, new Date(c.primer_timestamp));
    });

    // Calcular tiempos
    for (const solicitud of solicitudes) {
      const primeraCotizacion = cotizacionesMap.get(solicitud.id_solicitud);
      if (primeraCotizacion) {
        const diffMs = primeraCotizacion.getTime() - solicitud.timestamp.getTime();
        // Incluir diferencias >= 0 (incluye igualdad, excluye negativos)
        if (diffMs >= 0) {
          // Convertir a minutos (consistente con matching)
          const diffMinutos = diffMs / (1000 * 60);
          tiempos.push(diffMinutos);
        }
      }
    }

    if (tiempos.length === 0) return 0;
    const promedio = tiempos.reduce((sum, t) => sum + t, 0) / tiempos.length;
    return Math.round(promedio * 100) / 100;
  }

  protected async calculateAverageMatchingTime(startDate: Date, endDate: Date, filters?: SegmentationFilters): Promise<number> {
    // Matching completado es cuando se asigna un prestador a una solicitud
    // Calculamos el tiempo entre la creación de la solicitud y la primera cotización del prestador asignado
    const solicitudesRepo = AppDataSource.getRepository(Solicitud);
    const cotizacionesRepo = AppDataSource.getRepository(Cotizacion);
    
    // Obtener solicitudes con prestador asignado y filtros (solo las que están en el rango de fechas)
    const qb = solicitudesRepo
      .createQueryBuilder('solicitud')
      .where('solicitud.timestamp >= :startDate', { startDate })
      .andWhere('solicitud.timestamp <= :endDate', { endDate })
      .andWhere('solicitud.id_prestador IS NOT NULL');
    
    this.applySolicitudFilters(qb, filters);
    const solicitudes = await qb.getMany();

    if (solicitudes.length === 0) return 0;

    const tiempos: number[] = [];

    // Para cada solicitud, buscar la primera cotización del prestador asignado
    for (const solicitud of solicitudes) {
      if (solicitud.id_prestador) {
        const primeraCotizacion = await cotizacionesRepo
          .createQueryBuilder('cotizacion')
          .where('cotizacion.id_solicitud = :idSolicitud', { idSolicitud: solicitud.id_solicitud })
          .andWhere('cotizacion.id_prestador = :idPrestador', { idPrestador: solicitud.id_prestador })
          .orderBy('cotizacion.timestamp', 'ASC')
          .getOne();

        if (primeraCotizacion) {
          const diffMs = primeraCotizacion.timestamp.getTime() - solicitud.timestamp.getTime();
          // Incluir diferencias >= 0 (incluye igualdad, excluye negativos)
          if (diffMs >= 0) {
            // Convertir a minutos
            const diffMinutos = diffMs / (1000 * 60);
            tiempos.push(diffMinutos);
          }
        }
      }
    }

    if (tiempos.length === 0) return 0;
    const promedio = tiempos.reduce((sum, t) => sum + t, 0) / tiempos.length;
    return Math.round(promedio * 100) / 100;
  }

  protected async calculateAverageProviderResponseTime(startDate: Date, endDate: Date, filters?: SegmentationFilters): Promise<number> {
    // Tiempo promedio de cotizaciones: para cada solicitud, calcular el promedio de tiempo
    // entre todas las cotizaciones propuestas, y luego promediar esos promedios
    const solicitudesRepo = AppDataSource.getRepository(Solicitud);
    const cotizacionesRepo = AppDataSource.getRepository(Cotizacion);
    
    // Obtener solicitudes con filtros (solo las que están en el rango de fechas)
    const qb = solicitudesRepo
      .createQueryBuilder('solicitud')
      .where('solicitud.timestamp >= :startDate', { startDate })
      .andWhere('solicitud.timestamp <= :endDate', { endDate });
    
    this.applySolicitudFilters(qb, filters);
    const solicitudes = await qb.getMany();

    if (solicitudes.length === 0) return 0;

    const promediosPorSolicitud: number[] = [];

    // Para cada solicitud, calcular el promedio de tiempo de todas sus cotizaciones
    for (const solicitud of solicitudes) {
      const cotizaciones = await cotizacionesRepo
        .createQueryBuilder('cotizacion')
        .where('cotizacion.id_solicitud = :idSolicitud', { idSolicitud: solicitud.id_solicitud })
        .orderBy('cotizacion.timestamp', 'ASC')
        .getMany();

      if (cotizaciones.length > 0) {
        const tiemposCotizaciones: number[] = [];
        
        // Calcular tiempo desde solicitud hasta cada cotización
        for (const cotizacion of cotizaciones) {
          const diffMs = cotizacion.timestamp.getTime() - solicitud.timestamp.getTime();
          if (diffMs >= 0) { // Incluir 0 y positivos
            const diffMinutos = diffMs / (1000 * 60);
            tiemposCotizaciones.push(diffMinutos);
          }
        }

        // Si hay tiempos válidos, calcular el promedio para esta solicitud
        if (tiemposCotizaciones.length > 0) {
          const promedioSolicitud = tiemposCotizaciones.reduce((sum, t) => sum + t, 0) / tiemposCotizaciones.length;
          promediosPorSolicitud.push(promedioSolicitud);
        }
      }
    }

    if (promediosPorSolicitud.length === 0) return 0;
    
    // Promediar los promedios de cada solicitud
    const promedioFinal = promediosPorSolicitud.reduce((sum, t) => sum + t, 0) / promediosPorSolicitud.length;
    return Math.round(promedioFinal * 100) / 100;
  }

  // ========== MÉTODOS PARA PRESTADORES ==========
  
  protected async countPrestadoresByEstado(estado: string, startDate: Date, endDate: Date, filters?: SegmentationFilters): Promise<number> {
    const repo = AppDataSource.getRepository(Prestador);
    const qb = repo
      .createQueryBuilder('prestador')
      .where('prestador.estado = :estado', { estado })
      .andWhere('prestador.timestamp >= :startDate', { startDate })
      .andWhere('prestador.timestamp <= :endDate', { endDate });
    
    this.applyPrestadorFilters(qb, filters);
    
    // Usar COUNT(DISTINCT) cuando hay filtros de rubro o zona (para evitar duplicados por múltiples habilidades/zonas)
    if (filters?.rubro || filters?.zona) {
      const result = await qb.select('COUNT(DISTINCT prestador.id)', 'count').getRawOne();
      return parseInt(result?.count || '0');
    }
    
    return await qb.getCount();
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

  /**
   * Obtiene las coordenadas de las zonas desde la base de datos
   * @returns Mapa de nombre de zona a coordenadas { lat: number, lon: number }
   */
  protected async getZonasCoordenadas(): Promise<Record<string, { lat: number; lon: number }>> {
    const repo = AppDataSource.getRepository(Zona);
    const zonas = await repo
      .createQueryBuilder('zona')
      .select('zona.nombre_zona', 'nombre_zona')
      .addSelect('zona.latitud', 'latitud')
      .addSelect('zona.longitud', 'longitud')
      .where('zona.latitud IS NOT NULL')
      .andWhere('zona.longitud IS NOT NULL')
      .andWhere('zona.activa = :activa', { activa: true })
      .getRawMany();

    const coordenadasMap: Record<string, { lat: number; lon: number }> = {};
    
    zonas.forEach(zona => {
      if (zona.nombre_zona && zona.latitud && zona.longitud) {
        coordenadasMap[zona.nombre_zona] = {
          lat: parseFloat(zona.latitud),
          lon: parseFloat(zona.longitud)
        };
      }
    });

    return coordenadasMap;
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

  // ========== MÉTODOS DE FILTRADO DE SEGMENTACIÓN ==========

  /**
   * Aplica filtros de segmentación a un query builder de solicitudes
   */
  protected applySolicitudFilters(
    qb: any,
    filters?: SegmentationFilters
  ): void {
    if (!filters) return;

    // Filtro por zona
    if (filters.zona) {
      qb.andWhere('solicitud.zona = :zona', { zona: filters.zona });
    }

    // Filtro por tipo de solicitud
    if (filters.tipoSolicitud) {
      if (filters.tipoSolicitud === 'abierta') {
        qb.andWhere('solicitud.id_prestador IS NULL');
      } else if (filters.tipoSolicitud === 'dirigida') {
        qb.andWhere('solicitud.id_prestador IS NOT NULL');
      }
    }

    // Filtro por rubro (requiere join: solicitud -> prestador -> habilidades -> rubro)
    // Nota: No usamos solicitud.id_habilidad porque SEARCH squad envía IDs incorrectos
    if (filters.rubro) {
      qb.leftJoin('prestadores', 'prestador', 'prestador.id_prestador = solicitud.id_prestador')
        .leftJoin('habilidades', 'habilidad', 'habilidad.id_usuario = prestador.id_prestador')
        .leftJoin('rubros', 'rubro', 'rubro.id_rubro = habilidad.id_rubro');
      
      if (typeof filters.rubro === 'number') {
        qb.andWhere('rubro.id_rubro = :rubroId', { rubroId: filters.rubro });
      } else {
        qb.andWhere('rubro.nombre_rubro = :rubroNombre', { rubroNombre: filters.rubro });
      }
    }
  }

  /**
   * Aplica filtros de segmentación a un query builder de pagos
   */
  protected applyPagoFilters(
    qb: any,
    filters?: SegmentationFilters
  ): void {
    if (!filters) return;

    // Filtro por método de pago
    if (filters.metodo) {
      qb.andWhere('pago.metodo = :metodo', { metodo: filters.metodo });
    }

    // Filtro por rango de monto
    if (filters.minMonto !== undefined) {
      qb.andWhere('pago.monto_total >= :minMonto', { minMonto: filters.minMonto });
    }
    if (filters.maxMonto !== undefined) {
      qb.andWhere('pago.monto_total <= :maxMonto', { maxMonto: filters.maxMonto });
    }

    // Filtro por zona (a través de solicitud)
    if (filters.zona) {
      qb.leftJoin('solicitudes', 'solicitud', 'solicitud.id_solicitud = pago.id_solicitud')
        .andWhere('solicitud.zona = :zona', { zona: filters.zona });
    }

    // Filtro por rubro (a través de solicitud -> prestador -> habilidad -> rubro)
    if (filters.rubro) {
      if (!filters.zona) {
        qb.leftJoin('solicitudes', 'solicitud', 'solicitud.id_solicitud = pago.id_solicitud');
      }
      qb.leftJoin('prestadores', 'prestador', 'prestador.id_prestador = solicitud.id_prestador')
        .leftJoin('habilidades', 'habilidad', 'habilidad.id_usuario = prestador.id_prestador')
        .leftJoin('rubros', 'rubro', 'rubro.id_rubro = habilidad.id_rubro');
      
      if (typeof filters.rubro === 'number') {
        qb.andWhere('rubro.id_rubro = :rubroId', { rubroId: filters.rubro });
      } else {
        qb.andWhere('rubro.nombre_rubro = :rubroNombre', { rubroNombre: filters.rubro });
      }
    }
  }

  /**
   * Aplica filtros de segmentación a un query builder de cotizaciones
   */
  protected applyCotizacionFilters(
    qb: any,
    filters?: SegmentationFilters
  ): void {
    if (!filters) return;

    // Filtro por zona (a través de solicitud)
    if (filters.zona) {
      qb.leftJoin('solicitudes', 'solicitud', 'solicitud.id_solicitud = cotizacion.id_solicitud')
        .andWhere('solicitud.zona = :zona', { zona: filters.zona });
    }

    // Filtro por tipo de solicitud (a través de solicitud)
    if (filters.tipoSolicitud) {
      if (!filters.zona) {
        qb.leftJoin('solicitudes', 'solicitud', 'solicitud.id_solicitud = cotizacion.id_solicitud');
      }
      if (filters.tipoSolicitud === 'abierta') {
        qb.andWhere('solicitud.id_prestador IS NULL');
      } else if (filters.tipoSolicitud === 'dirigida') {
        qb.andWhere('solicitud.id_prestador IS NOT NULL');
      }
    }

    // Filtro por rubro (a través de solicitud -> prestador -> habilidad -> rubro)
    if (filters.rubro) {
      if (!filters.zona && !filters.tipoSolicitud) {
        qb.leftJoin('solicitudes', 'solicitud', 'solicitud.id_solicitud = cotizacion.id_solicitud');
      }
      qb.leftJoin('prestadores', 'prestador', 'prestador.id_prestador = solicitud.id_prestador')
        .leftJoin('habilidades', 'habilidad', 'habilidad.id_usuario = prestador.id_prestador')
        .leftJoin('rubros', 'rubro', 'rubro.id_rubro = habilidad.id_rubro');
      
      if (typeof filters.rubro === 'number') {
        qb.andWhere('rubro.id_rubro = :rubroId', { rubroId: filters.rubro });
      } else {
        qb.andWhere('rubro.nombre_rubro = :rubroNombre', { rubroNombre: filters.rubro });
      }
    }
  }

  /**
   * Aplica filtros de segmentación a un query builder de prestadores
   */
  protected applyPrestadorFilters(
    qb: any,
    filters?: SegmentationFilters
  ): void {
    if (!filters) return;

    // Filtro por zona (usando tabla zonas - relación many-to-many)
    if (filters.zona) {
      qb.leftJoin('zonas', 'zona', 'zona.id_usuario = prestador.id_prestador AND zona.activa = true')
        .andWhere('zona.nombre_zona = :zona', { zona: filters.zona });
    }

    // Filtro por rubro (a través de habilidad -> rubro)
    if (filters.rubro) {
      qb.leftJoin('habilidades', 'habilidad', 'habilidad.id_usuario = prestador.id_prestador AND habilidad.activa = true')
        .leftJoin('rubros', 'rubro', 'rubro.id_rubro = habilidad.id_rubro');
      
      if (typeof filters.rubro === 'number') {
        qb.andWhere('rubro.id_rubro = :rubroId', { rubroId: filters.rubro });
      } else {
        qb.andWhere('rubro.nombre_rubro = :rubroNombre', { rubroNombre: filters.rubro });
      }
    }
  }
}
