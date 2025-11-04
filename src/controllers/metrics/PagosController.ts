import { Request, Response } from 'express';
import { DateRangeService } from '../../services/DateRangeService';
import { BaseController } from './BaseController';
import { PieMetricResponse } from '../../types';
import { AppDataSource } from '../../config/database';
import { Pago } from '../../models/Pago';

/**
 * Controlador para métricas de Pagos y Facturación
 */
export class PagosController extends BaseController {
  
  /**
   * GET /api/metrica/pagos/tasa-exito
   * 5. Tasa de éxito de pagos (%)
   */
  public async getTasaExitoPagos(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const aprobados = await this.countPagosByEstado('approved', dateRanges.startDate, dateRanges.endDate);
      const rechazados = await this.countPagosByEstado('rejected', dateRanges.startDate, dateRanges.endDate);
      const expirados = await this.countPagosByEstado('expired', dateRanges.startDate, dateRanges.endDate);
      const total = aprobados + rechazados + expirados;
      const currentRate = total > 0 ? (aprobados / total) * 100 : 0;

      const prevAprobados = await this.countPagosByEstado('approved', dateRanges.previousStartDate, dateRanges.previousEndDate);
      const prevRechazados = await this.countPagosByEstado('rejected', dateRanges.previousStartDate, dateRanges.previousEndDate);
      const prevExpirados = await this.countPagosByEstado('expired', dateRanges.previousStartDate, dateRanges.previousEndDate);
      const prevTotal = prevAprobados + prevRechazados + prevExpirados;
      const previousRate = prevTotal > 0 ? (prevAprobados / prevTotal) * 100 : 0;

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        this.roundPercentage(currentRate),
        this.roundPercentage(previousRate),
        async (start: Date, end: Date) => {
          const aprobadosInt = await this.countPagosByEstado('approved', start, end);
          const rechazadosInt = await this.countPagosByEstado('rejected', start, end);
          const expiradosInt = await this.countPagosByEstado('expired', start, end);
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
   */
  public async getIngresoTicket(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const ingresoBruto = await this.sumMontoPagosAprobados(dateRanges.startDate, dateRanges.endDate);
      const cantidadPagos = await this.countPagosByEstado('approved', dateRanges.startDate, dateRanges.endDate);
      const ticketMedio = cantidadPagos > 0 ? ingresoBruto / cantidadPagos : 0;

      const prevIngresoBruto = await this.sumMontoPagosAprobados(dateRanges.previousStartDate, dateRanges.previousEndDate);
      const prevCantidadPagos = await this.countPagosByEstado('approved', dateRanges.previousStartDate, dateRanges.previousEndDate);
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
        async (start: Date, end: Date) => this.sumMontoPagosAprobados(start, end)
      );

      const ticketMedioChartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          const ingresoInt = await this.sumMontoPagosAprobados(start, end);
          const cantidadInt = await this.countPagosByEstado('approved', start, end);
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
}

