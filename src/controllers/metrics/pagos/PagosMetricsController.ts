import { Request, Response } from 'express';
import { logger } from '../../../config/logger';
import { DateRangeService } from '../../../services/DateRangeService';
import { BaseMetricsCalculator } from '../../../services/BaseMetricsCalculator';
import { PeriodType, PieMetricResponse, SegmentationFilters } from '../../../types';
import { AppDataSource } from '../../../config/database';
import { Pago } from '../../../models/Pago';

export class PagosMetricsController extends BaseMetricsCalculator {
  
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
    const { rubro, zona, metodo, minMonto, maxMonto } = req.query;
    
    if (!rubro && !zona && !metodo && !minMonto && !maxMonto) {
      return undefined;
    }

    const filters: SegmentationFilters = {};
    
    if (rubro) {
      filters.rubro = isNaN(Number(rubro)) ? rubro as string : Number(rubro);
    }
    
    if (zona) {
      filters.zona = zona as string;
    }
    
    if (metodo) {
      filters.metodo = metodo as string;
    }
    
    if (minMonto || maxMonto) {
      filters.monto = {};
      if (minMonto) {
        filters.monto.min = Number(minMonto);
      }
      if (maxMonto) {
        filters.monto.max = Number(maxMonto);
      }
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
   * GET /api/metrica/pagos/tasa-exito
   * 5. Tasa de éxito de pagos (%)
   * Segmentar por: Método de pago, rubro
   */
  public async getTasaExitoPagos(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const aprobados = await this.countPagosByEstado('approved', dateRanges.startDate, dateRanges.endDate, filters);
      const rechazados = await this.countPagosByEstado('rejected', dateRanges.startDate, dateRanges.endDate, filters);
      const expirados = await this.countPagosByEstado('expired', dateRanges.startDate, dateRanges.endDate, filters);
      const total = aprobados + rechazados + expirados;
      const currentRate = total > 0 ? (aprobados / total) * 100 : 0;

      const prevAprobados = await this.countPagosByEstado('approved', dateRanges.previousStartDate, dateRanges.previousEndDate, filters);
      const prevRechazados = await this.countPagosByEstado('rejected', dateRanges.previousStartDate, dateRanges.previousEndDate, filters);
      const prevExpirados = await this.countPagosByEstado('expired', dateRanges.previousStartDate, dateRanges.previousEndDate, filters);
      const prevTotal = prevAprobados + prevRechazados + prevExpirados;
      const previousRate = prevTotal > 0 ? (prevAprobados / prevTotal) * 100 : 0;

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        this.roundPercentage(currentRate),
        this.roundPercentage(previousRate),
        async (start: Date, end: Date) => {
          const aprobadosInt = await this.countPagosByEstado('approved', start, end, filters);
          const rechazadosInt = await this.countPagosByEstado('rejected', start, end, filters);
          const expiradosInt = await this.countPagosByEstado('expired', start, end, filters);
          const totalInt = aprobadosInt + rechazadosInt + expiradosInt;
          return totalInt > 0 ? (aprobadosInt / totalInt) * 100 : 0;
        },
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getTasaExitoPagos');
    }
  }

  /**
   * GET /api/metrica/pagos/distribucion-metodos
   * 5. Distribución por métodos de pago
   */
  public async getDistribucionMetodosPago(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const repo = AppDataSource.getRepository(Pago);
      const result = await repo
        .createQueryBuilder('pago')
        .select('pago.metodo', 'metodo')
        .addSelect('COUNT(*)', 'count')
        .where('pago.timestamp_creado >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('pago.timestamp_creado <= :endDate', { endDate: dateRanges.endDate })
        .andWhere('pago.metodo IS NOT NULL')
        .groupBy('pago.metodo')
        .getRawMany();

      const distribution: PieMetricResponse = {};
      result.forEach(row => {
        distribution[row.metodo || 'DESCONOCIDO'] = parseInt(row.count);
      });

      res.status(200).json({ success: true, data: distribution });
    } catch (error) {
      await this.handleError(res, error, 'getDistribucionMetodosPago');
    }
  }

  /**
   * GET /api/metrica/pagos/distribucion-eventos
   * 6. Distribución por tipo de evento de pago (%)
   */
  public async getDistribucionEventosPago(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const aprobados = await this.countPagosByEstado('approved', dateRanges.startDate, dateRanges.endDate);
      const rechazados = await this.countPagosByEstado('rejected', dateRanges.startDate, dateRanges.endDate);
      const expirados = await this.countPagosByEstado('expired', dateRanges.startDate, dateRanges.endDate);
      const pendientes = await this.countPagosByEstado('pending', dateRanges.startDate, dateRanges.endDate);

      const distribution: PieMetricResponse = {
        'APROBADO': aprobados,
        'RECHAZADO': rechazados,
        'EXPIRADO': expirados,
        'PENDIENTE': pendientes
      };

      res.status(200).json({ success: true, data: distribution });
    } catch (error) {
      await this.handleError(res, error, 'getDistribucionEventosPago');
    }
  }

  /**
   * GET /api/metrica/pagos/tiempo-procesamiento
   * 7. Tiempo promedio de procesamiento de pagos (minutos)
   */
  public async getTiempoProcesamientoPagos(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const currentAvg = await this.calculateAverageProcessingTimePagos(dateRanges.startDate, dateRanges.endDate);
      const previousAvg = await this.calculateAverageProcessingTimePagos(dateRanges.previousStartDate, dateRanges.previousEndDate);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentAvg,
        previousAvg,
        async (start: Date, end: Date) => this.calculateAverageProcessingTimePagos(start, end),
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getTiempoProcesamientoPagos');
    }
  }

  /**
   * GET /api/metrica/pagos/ingreso-ticket
   * 10. Ingreso bruto y ticket medio (ARS)
   * Segmentar por: Rubro, zona, método
   */
  public async getIngresoTicket(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const ingresoBruto = await this.sumMontoPagosAprobados(dateRanges.startDate, dateRanges.endDate, filters);
      const cantidadPagos = await this.countPagosByEstado('approved', dateRanges.startDate, dateRanges.endDate, filters);
      const ticketMedio = cantidadPagos > 0 ? ingresoBruto / cantidadPagos : 0;

      const prevIngresoBruto = await this.sumMontoPagosAprobados(dateRanges.previousStartDate, dateRanges.previousEndDate, filters);
      const prevCantidadPagos = await this.countPagosByEstado('approved', dateRanges.previousStartDate, dateRanges.previousEndDate, filters);
      const prevTicketMedio = prevCantidadPagos > 0 ? prevIngresoBruto / prevCantidadPagos : 0;

      // Calcular métricas usando el método estándar
      const ingresoBrutoMetric = this.calculateCardMetric(
        this.roundPercentage(ingresoBruto),
        this.roundPercentage(prevIngresoBruto),
        'absoluto'
      );
      const ticketMedioMetric = this.calculateCardMetric(
        this.roundPercentage(ticketMedio),
        this.roundPercentage(prevTicketMedio),
        'absoluto'
      );

      const ingresoBrutoChartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => this.sumMontoPagosAprobados(start, end, filters)
      );

      const ticketMedioChartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          const ingresoInt = await this.sumMontoPagosAprobados(start, end, filters);
          const cantidadInt = await this.countPagosByEstado('approved', start, end, filters);
          return cantidadInt > 0 ? ingresoInt / cantidadInt : 0;
        }
      );

      ingresoBrutoMetric.chartData = ingresoBrutoChartData;
      ticketMedioMetric.chartData = ticketMedioChartData;

      res.status(200).json({
        success: true,
        data: {
          ingresoBruto: ingresoBrutoMetric,
          ticketMedio: ticketMedioMetric
        }
      });
    } catch (error) {
      await this.handleError(res, error, 'getIngresoTicket');
    }
  }

  /**
   * GET /api/metrica/pagos/exitosos (legacy)
   */
  public async getPagosExitosos(req: Request, res: Response): Promise<void> {
    await this.getTasaExitoPagos(req, res);
  }

  /**
   * GET /api/metrica/pagos/distribucion (legacy)
   */
  public async getPagosDistribucion(req: Request, res: Response): Promise<void> {
    await this.getDistribucionEventosPago(req, res);
  }

  /**
   * GET /api/metrica/pagos/tiempoProcesamiento (legacy)
   */
  public async getPagosTiempoProcesamiento(req: Request, res: Response): Promise<void> {
    await this.getTiempoProcesamientoPagos(req, res);
  }
}

