import { Request, Response } from 'express';
import { logger } from '../../../config/logger';
import { DateRangeService } from '../../../services/DateRangeService';
import { BaseMetricsCalculator } from '../../../services/BaseMetricsCalculator';
import { GeocodingService } from '../../../services/GeocodingService';
import { PeriodType, HeatmapResponse, HeatmapPoint, SegmentationFilters } from '../../../types';
import { AppDataSource } from '../../../config/database';
import { Solicitud } from '../../../models/Solicitud';
import { formatDateLocal } from '../../../utils/dateUtils';

export class SolicitudesMetricsController extends BaseMetricsCalculator {
  
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
      // Puede ser número o string
      const rubroValue = typeof rubro === 'string' && !isNaN(Number(rubro)) ? Number(rubro) : rubro;
      filters.rubro = rubroValue as string | number;
    }

    if (tipoSolicitud) {
      if (tipoSolicitud !== 'abierta' && tipoSolicitud !== 'dirigida') {
        throw new Error('tipoSolicitud debe ser "abierta" o "dirigida"');
      }
      filters.tipoSolicitud = tipoSolicitud as 'abierta' | 'dirigida';
    }

    // Si no hay filtros, retornar undefined
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
   * GET /api/metrica/solicitudes/volumen
   * 1. Volumen de demanda (N° de solicitudes totales, sin importar estado)
   */
  public async getVolumenDemanda(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const currentValue = await this.countAllSolicitudes(dateRanges.startDate, dateRanges.endDate, filters);
      const previousValue = await this.countAllSolicitudes(dateRanges.previousStartDate, dateRanges.previousEndDate, filters);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentValue,
        previousValue,
        async (start: Date, end: Date) => this.countAllSolicitudes(start, end, filters),
        'porcentaje'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getVolumenDemanda');
    }
  }

  /**
   * GET /api/metrica/solicitudes/tasa-cancelacion
   * 2. Tasa de cancelación de solicitudes (%)
   */
  public async getTasaCancelacionSolicitudes(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const totales = await this.countAllSolicitudes(dateRanges.startDate, dateRanges.endDate, filters);
      const canceladas = await this.countSolicitudesByEstado('cancelada', dateRanges.startDate, dateRanges.endDate, filters);

      const currentRate = totales > 0 ? (canceladas / totales) * 100 : 0;

      const prevTotales = await this.countAllSolicitudes(dateRanges.previousStartDate, dateRanges.previousEndDate, filters);
      const prevCanceladas = await this.countSolicitudesByEstado('cancelada', dateRanges.previousStartDate, dateRanges.previousEndDate, filters);
      const previousRate = prevTotales > 0 ? (prevCanceladas / prevTotales) * 100 : 0;

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        this.roundPercentage(currentRate),
        this.roundPercentage(previousRate),
        async (start: Date, end: Date) => {
          const totalesInt = await this.countAllSolicitudes(start, end, filters);
          const canceladasInt = await this.countSolicitudesByEstado('cancelada', start, end, filters);
          const rate = totalesInt > 0 ? (canceladasInt / totalesInt) * 100 : 0;
          return this.roundPercentage(rate);
        },
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getTasaCancelacionSolicitudes');
    }
  }

  /**
   * GET /api/metrica/solicitudes/mapa-calor
   * 6. Mapa de calor de pedidos
   * Usa geocodificación de direcciones para ubicar solicitudes en el mapa
   */
  public async getMapaCalorPedidos(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const repo = AppDataSource.getRepository(Solicitud);
      const qb = repo
        .createQueryBuilder('solicitud')
        .select('solicitud.direccion', 'direccion')
        .addSelect('COUNT(*)', 'count')
        .where('solicitud.created_at >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('solicitud.created_at <= :endDate', { endDate: dateRanges.endDate })
        .andWhere('solicitud.direccion IS NOT NULL')
        .groupBy('solicitud.direccion');
      
      this.applySolicitudFilters(qb, filters);
      const result = await qb.getRawMany();

      logger.info(`📍 Geocoding ${result.length} unique addresses for heatmap`);

      const points: HeatmapPoint[] = [];
      
      // Geocodificar cada dirección única
      // NOTA: Esto puede ser lento si hay muchas direcciones únicas
      // En producción considerar geocodificar en background o usar cache persistente
      for (const row of result) {
        const direccion = row.direccion;
        const count = parseInt(row.count);
        
        if (direccion) {
          const coords = await GeocodingService.geocode(direccion);
          points.push({
            lat: coords.lat,
            lon: coords.lon,
            intensity: count
          });
        }
      }

      logger.info(`✅ Heatmap generated with ${points.length} points`);

      const response: HeatmapResponse = {
        data: points,
        totalPoints: points.length,
        period: {
          startDate: formatDateLocal(dateRanges.startDate),
          endDate: formatDateLocal(dateRanges.endDate)
        }
      };

      res.status(200).json({ success: true, data: response });
    } catch (error) {
      await this.handleError(res, error, 'getMapaCalorPedidos');
    }
  }

  /**
   * GET /api/metrica/pedidos/mapa-calor (legacy)
   * Alias para getMapaCalorPedidos
   */
  public async getPedidosMapaCalor(req: Request, res: Response): Promise<void> {
    return this.getMapaCalorPedidos(req, res);
  }
}

