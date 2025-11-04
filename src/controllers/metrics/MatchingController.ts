import { Request, Response } from 'express';
import { DateRangeService } from '../../services/DateRangeService';
import { BaseController } from './BaseController';
import { AppDataSource } from '../../config/database';
import { Cotizacion } from '../../models/Cotizacion';

/**
 * Controlador para métricas de Matching y Agenda
 */
export class MatchingController extends BaseController {
  
  /**
   * GET /api/metrica/matching/tiempo-promedio
   * 14. Tiempo promedio de matching
   */
  public async getTiempoPromedioMatching(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const currentAvg = await this.calculateAverageMatchingTime(dateRanges.startDate, dateRanges.endDate);
      const previousAvg = await this.calculateAverageMatchingTime(dateRanges.previousStartDate, dateRanges.previousEndDate);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentAvg,
        previousAvg,
        async (start: Date, end: Date) => this.calculateAverageMatchingTime(start, end),
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

      const repo = AppDataSource.getRepository(Cotizacion);
      const pendientes = await repo
        .createQueryBuilder('cotizacion')
        .where('cotizacion.estado = :estado', { estado: 'emitida' })
        .andWhere('cotizacion.timestamp >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('cotizacion.timestamp <= :endDate', { endDate: dateRanges.endDate })
        .getCount();

      const prevPendientes = await repo
        .createQueryBuilder('cotizacion')
        .where('cotizacion.estado = :estado', { estado: 'emitida' })
        .andWhere('cotizacion.timestamp >= :startDate', { startDate: dateRanges.previousStartDate })
        .andWhere('cotizacion.timestamp <= :endDate', { endDate: dateRanges.previousEndDate })
        .getCount();

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        pendientes,
        prevPendientes,
        async (start: Date, end: Date) => {
          return await repo
            .createQueryBuilder('cotizacion')
            .where('cotizacion.estado = :estado', { estado: 'emitida' })
            .andWhere('cotizacion.timestamp >= :startDate', { startDate: start })
            .andWhere('cotizacion.timestamp <= :endDate', { endDate: end })
            .getCount();
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

      const currentAvg = await this.calculateAverageProviderResponseTime(dateRanges.startDate, dateRanges.endDate);
      const previousAvg = await this.calculateAverageProviderResponseTime(dateRanges.previousStartDate, dateRanges.previousEndDate);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentAvg,
        previousAvg,
        async (start: Date, end: Date) => this.calculateAverageProviderResponseTime(start, end),
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

      const expiradas = await this.countCotizacionesByEstado('expirada', dateRanges.startDate, dateRanges.endDate);
      const todasEmitidas = await this.countCotizaciones(dateRanges.startDate, dateRanges.endDate);
      const currentRate = todasEmitidas > 0 ? (expiradas / todasEmitidas) * 100 : 0;

      const prevExpiradas = await this.countCotizacionesByEstado('expirada', dateRanges.previousStartDate, dateRanges.previousEndDate);
      const prevTodasEmitidas = await this.countCotizaciones(dateRanges.previousStartDate, dateRanges.previousEndDate);
      const previousRate = prevTodasEmitidas > 0 ? (prevExpiradas / prevTodasEmitidas) * 100 : 0;

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        this.roundPercentage(currentRate),
        this.roundPercentage(previousRate),
        async (start: Date, end: Date) => {
          const expiradas = await this.countCotizacionesByEstado('expirada', start, end);
          const todasEmitidas = await this.countCotizaciones(start, end);
          return todasEmitidas > 0 ? (expiradas / todasEmitidas) * 100 : 0;
        },
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getTasaCotizacionesExpiradas');
    }
  }
}

