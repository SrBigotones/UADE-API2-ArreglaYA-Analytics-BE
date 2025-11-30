import { Request, Response } from 'express';
import { logger } from '../../../config/logger';
import { DateRangeService } from '../../../services/DateRangeService';
import { BaseMetricsCalculator } from '../../../services/BaseMetricsCalculator';
import { PeriodType, SegmentationFilters } from '../../../types';
import { AppDataSource } from '../../../config/database';
import { Solicitud } from '../../../models/Solicitud';

export class MatchingMetricsController extends BaseMetricsCalculator {
  
  /**
   * Valida y parsea los parámetros de período de tiempo
   */
  private parsePeriodParams(req: Request): PeriodType {
    const { period, startDate, endDate } = req.query;

    if (!period) {
      throw new Error('El parámetro period es requerido');
    }

    const validPeriods = ['hoy', 'ultimos_7_dias', 'ultimos_30_dias', 'ultimo_ano', 'personalizado'];
    if (!validPeriods.includes(period as string)) {
      throw new Error(`Período no válido. Debe ser uno de: ${validPeriods.join(', ')}`);
    }

    const periodType: PeriodType = {
      type: period as PeriodType['type']
    };

    if (period === 'personalizado') {
      if (!startDate || !endDate) {
        throw new Error('startDate y endDate son requeridos para período personalizado');
      }

      if (!DateRangeService.validateCustomDates(startDate as string, endDate as string)) {
        throw new Error('Fechas personalizadas no válidas');
      }

      periodType.startDate = startDate as string;
      periodType.endDate = endDate as string;
    }

    return periodType;
  }

  /**
   * Parsea y valida los parámetros de segmentación
   * NOTA: Zona removida - no es confiable en solicitudes
   */
  protected parseSegmentationParams(req: Request): SegmentationFilters | undefined {
    const { rubro, tipoSolicitud } = req.query;
    const filters: SegmentationFilters = {};

    if (rubro) {
      const rubroValue = typeof rubro === 'string' && !isNaN(Number(rubro)) ? Number(rubro) : rubro;
      filters.rubro = rubroValue as string | number;
    }

    if (tipoSolicitud) {
      if (tipoSolicitud !== 'abierta' && tipoSolicitud !== 'dirigida') {
        throw new Error('tipoSolicitud debe ser "abierta" o "dirigida"');
      }
      filters.tipoSolicitud = tipoSolicitud as 'abierta' | 'dirigida';
    }

    return Object.keys(filters).length > 0 ? filters : undefined;
  }

  /**
   * Helper method to calculate card metric with historical data to reduce duplication
   */
  private async calculateMetricWithChart(
    periodType: PeriodType,
    dateRanges: any,
    currentValue: number,
    previousValue: number,
    calculateHistoricalValue: (start: Date, end: Date) => Promise<number>,
    changeType: 'porcentaje' | 'absoluto' = 'porcentaje'
  ) {
    try {
      const metric = this.calculateCardMetric(currentValue, previousValue, changeType);
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        calculateHistoricalValue
      );
      metric.chartData = chartData;
      return metric;
    } catch (error) {
      logger.error('Error calculating metric with chart:', error);
      // Return metric without chart data if historical calculation fails
      const metric = this.calculateCardMetric(currentValue, previousValue, changeType);
      metric.chartData = [];
      return metric;
    }
  }

  /**
   * Helper to round percentage values consistently
   */
  private roundPercentage(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private async handleError(res: Response, error: any, context: string): Promise<void> {
    logger.error(`Error in ${context}:`, error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  /**
   * GET /api/metrica/matching/cotizaciones/conversion-aceptada
   * 4. Conversión a cotización aceptada (%)
   * 
   * REIMPLEMENTADO: Ahora usa estado directamente
   * Tasa = (solicitudes con estado = 'aceptada') / (solicitudes con estado = 'aceptada' + estado = 'cancelada')
   */
  public async getConversionCotizacionAceptada(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const repo = AppDataSource.getRepository(Solicitud);
      
      // Solicitudes aceptadas = estado = 'aceptada'
      const qbAceptadas = repo
        .createQueryBuilder('solicitud')
        .where('solicitud.created_at >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('solicitud.created_at <= :endDate', { endDate: dateRanges.endDate })
        .andWhere('solicitud.estado = :estado', { estado: 'aceptada' });
      this.applySolicitudFilters(qbAceptadas, filters);
      const aceptadas = await qbAceptadas.getCount();
      
      // Solicitudes canceladas
      const qbCanceladas = repo
        .createQueryBuilder('solicitud')
        .where('solicitud.created_at >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('solicitud.created_at <= :endDate', { endDate: dateRanges.endDate })
        .andWhere('solicitud.estado = :estado', { estado: 'cancelada' });
      this.applySolicitudFilters(qbCanceladas, filters);
      const canceladas = await qbCanceladas.getCount();
      
      const total = aceptadas + canceladas;
      const currentRate = total > 0 ? (aceptadas / total) * 100 : 0;

      // Período anterior
      const prevQbAceptadas = repo
        .createQueryBuilder('solicitud')
        .where('solicitud.created_at >= :startDate', { startDate: dateRanges.previousStartDate })
        .andWhere('solicitud.created_at <= :endDate', { endDate: dateRanges.previousEndDate })
        .andWhere('solicitud.estado = :estado', { estado: 'aceptada' });
      this.applySolicitudFilters(prevQbAceptadas, filters);
      const prevAceptadas = await prevQbAceptadas.getCount();
      
      const prevQbCanceladas = repo
        .createQueryBuilder('solicitud')
        .where('solicitud.created_at >= :startDate', { startDate: dateRanges.previousStartDate })
        .andWhere('solicitud.created_at <= :endDate', { endDate: dateRanges.previousEndDate })
        .andWhere('solicitud.estado = :estado', { estado: 'cancelada' });
      this.applySolicitudFilters(prevQbCanceladas, filters);
      const prevCanceladas = await prevQbCanceladas.getCount();
      
      const prevTotal = prevAceptadas + prevCanceladas;
      const previousRate = prevTotal > 0 ? (prevAceptadas / prevTotal) * 100 : 0;

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        this.roundPercentage(currentRate),
        this.roundPercentage(previousRate),
        async (start: Date, end: Date) => {
          const intQbAceptadas = repo
            .createQueryBuilder('solicitud')
            .where('solicitud.created_at >= :startDate', { startDate: start })
            .andWhere('solicitud.created_at <= :endDate', { endDate: end })
            .andWhere('solicitud.estado = :estado', { estado: 'aceptada' });
          this.applySolicitudFilters(intQbAceptadas, filters);
          const aceptadasInt = await intQbAceptadas.getCount();
          
          const intQbCanceladas = repo
            .createQueryBuilder('solicitud')
            .where('solicitud.created_at >= :startDate', { startDate: start })
            .andWhere('solicitud.created_at <= :endDate', { endDate: end })
            .andWhere('solicitud.estado = :estado', { estado: 'cancelada' });
          this.applySolicitudFilters(intQbCanceladas, filters);
          const canceladasInt = await intQbCanceladas.getCount();
          
          const totalInt = aceptadasInt + canceladasInt;
          const rate = totalInt > 0 ? (aceptadasInt / totalInt) * 100 : 0;
          return this.roundPercentage(rate);
        },
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getConversionCotizacionAceptada');
    }
  }

  /**
   * GET /api/metrica/matching/tiempo-promedio
   * 14. Tiempo promedio de matching
   * Calcula el tiempo promedio desde que se crea la solicitud hasta que se acepta la cotización (fecha_confirmacion)
   */
  public async getTiempoPromedioMatching(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const currentAvg = await this.calculateAverageMatchingTimeFromConfirmacion(dateRanges.startDate, dateRanges.endDate, filters);
      const previousAvg = await this.calculateAverageMatchingTimeFromConfirmacion(dateRanges.previousStartDate, dateRanges.previousEndDate, filters);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentAvg,
        previousAvg,
        async (start: Date, end: Date) => this.calculateAverageMatchingTimeFromConfirmacion(start, end, filters),
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getTiempoPromedioMatching');
    }
  }

  /**
   * GET /api/metrica/matching/solicitudes/pendientes
   * 15. Solicitudes pendientes (renombrado de "Cotizaciones pendientes")
   * 
   * Solicitudes "pendientes" son aquellas que:
   * - NO tienen fecha_confirmacion (no fueron aceptadas aún)
   * - NO están canceladas
   * - NO están rechazadas
   * 
   * Esto incluye:
   * - Solicitudes recién creadas (esperando matching)
   * - Solicitudes con prestador asignado (esperando aceptación del cliente)
   */
  public async getSolicitudesPendientes(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      // Solicitudes pendientes: creadas en el período, sin fecha_confirmacion, no canceladas ni rechazadas
      const repo = AppDataSource.getRepository(Solicitud);
      
      const qb = repo
        .createQueryBuilder('solicitud')
        .where('solicitud.created_at >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('solicitud.created_at <= :endDate', { endDate: dateRanges.endDate })
        .andWhere('solicitud.fecha_confirmacion IS NULL')
        .andWhere('solicitud.estado NOT IN (:...estados)', { estados: ['cancelada', 'rechazada'] });
      
      this.applySolicitudFilters(qb, filters);
      const pendientes = await qb.getCount();
      
      const prevQb = repo
        .createQueryBuilder('solicitud')
        .where('solicitud.created_at >= :startDate', { startDate: dateRanges.previousStartDate })
        .andWhere('solicitud.created_at <= :endDate', { endDate: dateRanges.previousEndDate })
        .andWhere('solicitud.fecha_confirmacion IS NULL')
        .andWhere('solicitud.estado NOT IN (:...estados)', { estados: ['cancelada', 'rechazada'] });
      
      this.applySolicitudFilters(prevQb, filters);
      const prevPendientes = await prevQb.getCount();

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        pendientes,
        prevPendientes,
        async (start: Date, end: Date) => {
          const intQb = repo
            .createQueryBuilder('solicitud')
            .where('solicitud.created_at >= :startDate', { startDate: start })
            .andWhere('solicitud.created_at <= :endDate', { endDate: end })
            .andWhere('solicitud.fecha_confirmacion IS NULL')
            .andWhere('solicitud.estado NOT IN (:...estados)', { estados: ['cancelada', 'rechazada'] });
          
          this.applySolicitudFilters(intQb, filters);
          return await intQb.getCount();
        },
        'porcentaje'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getSolicitudesPendientes');
    }
  }

  /**
   * GET /api/metrica/matching/conversion (legacy)
   */
  public async getMatchingConversion(req: Request, res: Response): Promise<void> {
    await this.getConversionCotizacionAceptada(req, res);
  }
}

