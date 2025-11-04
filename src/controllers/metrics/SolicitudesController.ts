import { Request, Response } from 'express';
import { DateRangeService } from '../../services/DateRangeService';
import { BaseController } from './BaseController';

/**
 * Controlador para métricas de Búsqueda y Solicitudes
 */
export class SolicitudesController extends BaseController {
  
  /**
   * GET /api/metrica/solicitudes/volumen
   * 1. Volumen de demanda (N° de solicitudes creadas)
   */
  public async getVolumenDemanda(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const currentValue = await this.countSolicitudesByEstado('creada', dateRanges.startDate, dateRanges.endDate);
      const previousValue = await this.countSolicitudesByEstado('creada', dateRanges.previousStartDate, dateRanges.previousEndDate);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentValue,
        previousValue,
        async (start: Date, end: Date) => this.countSolicitudesByEstado('creada', start, end),
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

      const creadas = await this.countSolicitudesByEstado('creada', dateRanges.startDate, dateRanges.endDate);
      const canceladas = await this.countSolicitudesByEstado('cancelada', dateRanges.startDate, dateRanges.endDate);

      const currentRate = creadas > 0 ? (canceladas / creadas) * 100 : 0;

      const prevCreadas = await this.countSolicitudesByEstado('creada', dateRanges.previousStartDate, dateRanges.previousEndDate);
      const prevCanceladas = await this.countSolicitudesByEstado('cancelada', dateRanges.previousStartDate, dateRanges.previousEndDate);
      const previousRate = prevCreadas > 0 ? (prevCanceladas / prevCreadas) * 100 : 0;

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        this.roundPercentage(currentRate),
        this.roundPercentage(previousRate),
        async (start: Date, end: Date) => {
          const creadasInt = await this.countSolicitudesByEstado('creada', start, end);
          const canceladasInt = await this.countSolicitudesByEstado('cancelada', start, end);
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
   */
  public async getTiempoPrimeraCotizacion(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const currentAvg = await this.calculateAverageTimeToFirstQuote(dateRanges.startDate, dateRanges.endDate);
      const previousAvg = await this.calculateAverageTimeToFirstQuote(dateRanges.previousStartDate, dateRanges.previousEndDate);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentAvg,
        previousAvg,
        async (start: Date, end: Date) => this.calculateAverageTimeToFirstQuote(start, end),
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getTiempoPrimeraCotizacion');
    }
  }

  /**
   * GET /api/metrica/cotizaciones/conversion-aceptada
   * 4. Conversión a cotización aceptada (%)
   */
  public async getConversionCotizacionAceptada(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const aceptadas = await this.countCotizacionesByEstado('aceptada', dateRanges.startDate, dateRanges.endDate);
      const rechazadas = await this.countCotizacionesByEstado('rechazada', dateRanges.startDate, dateRanges.endDate);
      const total = aceptadas + rechazadas;
      const currentRate = total > 0 ? (aceptadas / total) * 100 : 0;

      const prevAceptadas = await this.countCotizacionesByEstado('aceptada', dateRanges.previousStartDate, dateRanges.previousEndDate);
      const prevRechazadas = await this.countCotizacionesByEstado('rechazada', dateRanges.previousStartDate, dateRanges.previousEndDate);
      const prevTotal = prevAceptadas + prevRechazadas;
      const previousRate = prevTotal > 0 ? (prevAceptadas / prevTotal) * 100 : 0;

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        this.roundPercentage(currentRate),
        this.roundPercentage(previousRate),
        async (start: Date, end: Date) => {
          const aceptadasInt = await this.countCotizacionesByEstado('aceptada', start, end);
          const rechazadasInt = await this.countCotizacionesByEstado('rechazada', start, end);
          const totalInt = aceptadasInt + rechazadasInt;
          return totalInt > 0 ? (aceptadasInt / totalInt) * 100 : 0;
        },
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getConversionCotizacionAceptada');
    }
  }
}

