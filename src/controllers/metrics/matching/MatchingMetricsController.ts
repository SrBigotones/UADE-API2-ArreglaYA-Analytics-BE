import { Request, Response } from 'express';
import { logger } from '../../../config/logger';
import { DateRangeService } from '../../../services/DateRangeService';
import { BaseMetricsCalculator } from '../../../services/BaseMetricsCalculator';
import { PeriodType, SegmentationFilters } from '../../../types';
import { AppDataSource } from '../../../config/database';
import { Cotizacion } from '../../../models/Cotizacion';

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
   */
  protected parseSegmentationParams(req: Request): SegmentationFilters | undefined {
    const { rubro, zona, tipoSolicitud } = req.query;
    const filters: SegmentationFilters = {};

    if (rubro) {
      const rubroValue = typeof rubro === 'string' && !isNaN(Number(rubro)) ? Number(rubro) : rubro;
      filters.rubro = rubroValue as string | number;
    }

    if (zona) {
      filters.zona = zona as string;
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
   * GET /api/metrica/cotizaciones/conversion-aceptada
   * 4. Conversión a cotización aceptada (%)
   */
  public async getConversionCotizacionAceptada(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const aceptadas = await this.countCotizacionesByEstado('aceptada', dateRanges.startDate, dateRanges.endDate, filters);
      const rechazadas = await this.countCotizacionesByEstado('rechazada', dateRanges.startDate, dateRanges.endDate, filters);
      const total = aceptadas + rechazadas;
      const currentRate = total > 0 ? (aceptadas / total) * 100 : 0;

      const prevAceptadas = await this.countCotizacionesByEstado('aceptada', dateRanges.previousStartDate, dateRanges.previousEndDate, filters);
      const prevRechazadas = await this.countCotizacionesByEstado('rechazada', dateRanges.previousStartDate, dateRanges.previousEndDate, filters);
      const prevTotal = prevAceptadas + prevRechazadas;
      const previousRate = prevTotal > 0 ? (prevAceptadas / prevTotal) * 100 : 0;

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        this.roundPercentage(currentRate),
        this.roundPercentage(previousRate),
        async (start: Date, end: Date) => {
          const aceptadasInt = await this.countCotizacionesByEstado('aceptada', start, end, filters);
          const rechazadasInt = await this.countCotizacionesByEstado('rechazada', start, end, filters);
          const totalInt = aceptadasInt + rechazadasInt;
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
   */
  public async getTiempoPromedioMatching(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const currentAvg = await this.calculateAverageMatchingTime(dateRanges.startDate, dateRanges.endDate, filters);
      const previousAvg = await this.calculateAverageMatchingTime(dateRanges.previousStartDate, dateRanges.previousEndDate, filters);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentAvg,
        previousAvg,
        async (start: Date, end: Date) => this.calculateAverageMatchingTime(start, end, filters),
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getTiempoPromedioMatching');
    }
  }

  /**
   * GET /api/metrica/cotizaciones/pendientes
   * 15. Cotizaciones pendientes
   */
  public async getCotizacionesPendientes(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      // Cotizaciones pendientes son las emitidas que no están aceptadas ni rechazadas ni expiradas
      const pendientes = await this.countCotizacionesByEstado('emitida', dateRanges.startDate, dateRanges.endDate, filters);
      const prevPendientes = await this.countCotizacionesByEstado('emitida', dateRanges.previousStartDate, dateRanges.previousEndDate, filters);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        pendientes,
        prevPendientes,
        async (start: Date, end: Date) => {
          return await this.countCotizacionesByEstado('emitida', start, end, filters);
        },
        'porcentaje'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getCotizacionesPendientes');
    }
  }

  /**
   * GET /api/metrica/prestadores/tiempo-respuesta
   * 16. Tiempo promedio de respuesta del prestador
   */
  public async getTiempoRespuestaPrestador(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const currentAvg = await this.calculateAverageProviderResponseTime(dateRanges.startDate, dateRanges.endDate, filters);
      const previousAvg = await this.calculateAverageProviderResponseTime(dateRanges.previousStartDate, dateRanges.previousEndDate, filters);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentAvg,
        previousAvg,
        async (start: Date, end: Date) => this.calculateAverageProviderResponseTime(start, end, filters),
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getTiempoRespuestaPrestador');
    }
  }

  /**
   * GET /api/metrica/cotizaciones/tasa-expiracion
   * 17. Cotizaciones expiradas (%)
   */
  public async getTasaCotizacionesExpiradas(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const expiradas = await this.countCotizacionesByEstado('expirada', dateRanges.startDate, dateRanges.endDate, filters);
      const todasEmitidas = await this.countCotizaciones(dateRanges.startDate, dateRanges.endDate, filters);
      const currentRate = todasEmitidas > 0 ? (expiradas / todasEmitidas) * 100 : 0;

      const prevExpiradas = await this.countCotizacionesByEstado('expirada', dateRanges.previousStartDate, dateRanges.previousEndDate, filters);
      const prevTodasEmitidas = await this.countCotizaciones(dateRanges.previousStartDate, dateRanges.previousEndDate, filters);
      const previousRate = prevTodasEmitidas > 0 ? (prevExpiradas / prevTodasEmitidas) * 100 : 0;

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        this.roundPercentage(currentRate),
        this.roundPercentage(previousRate),
        async (start: Date, end: Date) => {
          const expiradas = await this.countCotizacionesByEstado('expirada', start, end, filters);
          const todasEmitidas = await this.countCotizaciones(start, end, filters);
          const rate = todasEmitidas > 0 ? (expiradas / todasEmitidas) * 100 : 0;
          return this.roundPercentage(rate);
        },
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getTasaCotizacionesExpiradas');
    }
  }

  /**
   * GET /api/metrica/matching/conversion (legacy)
   */
  public async getMatchingConversion(req: Request, res: Response): Promise<void> {
    await this.getConversionCotizacionAceptada(req, res);
  }

  /**
   * GET /api/metrica/matching/lead-time (legacy)
   */
  public async getMatchingLeadTime(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const currentAvg = await this.calculateAverageTimeToFirstQuote(dateRanges.startDate, dateRanges.endDate, filters);
      const previousAvg = await this.calculateAverageTimeToFirstQuote(dateRanges.previousStartDate, dateRanges.previousEndDate, filters);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentAvg,
        previousAvg,
        async (start: Date, end: Date) => this.calculateAverageTimeToFirstQuote(start, end, filters),
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getMatchingLeadTime');
    }
  }
}

