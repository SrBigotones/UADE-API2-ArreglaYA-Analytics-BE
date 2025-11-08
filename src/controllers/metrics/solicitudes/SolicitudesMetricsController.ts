import { Request, Response } from 'express';
import { logger } from '../../../config/logger';
import { DateRangeService } from '../../../services/DateRangeService';
import { BaseMetricsCalculator } from '../../../services/BaseMetricsCalculator';
import { PeriodType, HeatmapResponse, HeatmapPoint, SegmentationFilters } from '../../../types';
import { AppDataSource } from '../../../config/database';
import { Solicitud } from '../../../models/Solicitud';

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
   * Parsea los parámetros de segmentación del request
   */
  private parseSegmentationParams(req: Request): SegmentationFilters | undefined {
    const { rubro, zona, tipoSolicitud } = req.query;
    
    if (!rubro && !zona && !tipoSolicitud) {
      return undefined;
    }

    const filters: SegmentationFilters = {};
    
    if (rubro) {
      // Puede ser string (nombre) o number (id)
      filters.rubro = isNaN(Number(rubro)) ? rubro as string : Number(rubro);
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
   * GET /api/metrica/solicitudes/volumen
   * 1. Volumen de demanda (N° de solicitudes creadas)
   * Segmentar por: Rubro, zona
   */
  public async getVolumenDemanda(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const currentValue = await this.countSolicitudesByEstado('creada', dateRanges.startDate, dateRanges.endDate, filters);
      const previousValue = await this.countSolicitudesByEstado('creada', dateRanges.previousStartDate, dateRanges.previousEndDate, filters);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentValue,
        previousValue,
        async (start: Date, end: Date) => this.countSolicitudesByEstado('creada', start, end, filters),
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
   * Segmentar por: Rubro, zona
   */
  public async getTasaCancelacionSolicitudes(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const creadas = await this.countSolicitudesByEstado('creada', dateRanges.startDate, dateRanges.endDate, filters);
      const canceladas = await this.countSolicitudesByEstado('cancelada', dateRanges.startDate, dateRanges.endDate, filters);

      const currentRate = creadas > 0 ? (canceladas / creadas) * 100 : 0;

      const prevCreadas = await this.countSolicitudesByEstado('creada', dateRanges.previousStartDate, dateRanges.previousEndDate, filters);
      const prevCanceladas = await this.countSolicitudesByEstado('cancelada', dateRanges.previousStartDate, dateRanges.previousEndDate, filters);
      const previousRate = prevCreadas > 0 ? (prevCanceladas / prevCreadas) * 100 : 0;

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        this.roundPercentage(currentRate),
        this.roundPercentage(previousRate),
        async (start: Date, end: Date) => {
          const creadasInt = await this.countSolicitudesByEstado('creada', start, end, filters);
          const canceladasInt = await this.countSolicitudesByEstado('cancelada', start, end, filters);
          return creadasInt > 0 ? (canceladasInt / creadasInt) * 100 : 0;
        },
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getTasaCancelacionSolicitudes');
    }
  }

  /**
   * GET /api/metrica/solicitudes/tiempo-primera-cotizacion
   * 3. Tiempo a primera cotización (horas)
   * Segmentar por: Rubro, tipo de solicitud (abierta/dirigida)
   */
  public async getTiempoPrimeraCotizacion(req: Request, res: Response): Promise<void> {
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
      await this.handleError(res, error, 'getTiempoPrimeraCotizacion');
    }
  }

  /**
   * GET /api/metrica/solicitudes/mapa-calor
   * 6. Mapa de calor de pedidos
   */
  public async getMapaCalorPedidos(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const solicitudesPorZona = await this.countSolicitudesPorZona(dateRanges.startDate, dateRanges.endDate);
      
      // Por ahora retornamos datos por zona (las coordenadas se pueden mapear después)
      const points: HeatmapPoint[] = [];
      
      // Si hay coordenadas en las solicitudes, usarlas; si no, usar zonas
      const solicitudes = await AppDataSource.getRepository(Solicitud)
        .createQueryBuilder('solicitud')
        .where('solicitud.timestamp >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('solicitud.timestamp <= :endDate', { endDate: dateRanges.endDate })
        .getMany();

      // Agrupar por zona y crear puntos (requeriría mapeo de zonas a coordenadas)
      // Por ahora retornar estructura básica
      const response: HeatmapResponse = {
        data: points,
        totalPoints: solicitudes.length,
        period: {
          startDate: dateRanges.startDate.toISOString().split('T')[0],
          endDate: dateRanges.endDate.toISOString().split('T')[0]
        }
      };

      res.status(200).json({ success: true, data: response });
    } catch (error) {
      await this.handleError(res, error, 'getMapaCalorPedidos');
    }
  }

  /**
   * GET /api/metrica/pedidos/mapa-calor (legacy - requiere coordenadas que no están en solicitudes)
   */
  public async getPedidosMapaCalor(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const repo = AppDataSource.getRepository(Solicitud);
      const solicitudes = await repo
        .createQueryBuilder('solicitud')
        .where('solicitud.timestamp >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('solicitud.timestamp <= :endDate', { endDate: dateRanges.endDate })
        .getMany();

      // Agrupar por zona (ya que no tenemos coordenadas)
      const zonasMap = new Map<string, number>();
      solicitudes.forEach(s => {
        if (s.zona) {
          zonasMap.set(s.zona, (zonasMap.get(s.zona) || 0) + 1);
        }
      });

      const heatmapPoints: HeatmapPoint[] = [];
      // Nota: Sin coordenadas, retornamos puntos ficticios basados en zonas
      zonasMap.forEach((count, zona) => {
        // Coordenadas aproximadas por zona (deberían venir de una tabla de zonas)
        heatmapPoints.push({
          lat: -34.6037, // Buenos Aires por defecto
          lon: -58.3816,
          intensity: count
        });
      });

      const response: HeatmapResponse = {
        data: heatmapPoints,
        totalPoints: heatmapPoints.length,
        period: {
          startDate: dateRanges.startDate.toISOString(),
          endDate: dateRanges.endDate.toISOString()
        }
      };

      res.status(200).json({ success: true, data: response });
    } catch (error) {
      await this.handleError(res, error, 'getPedidosMapaCalor');
    }
  }
}

