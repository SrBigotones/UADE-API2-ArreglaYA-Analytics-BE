import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { DateRangeService } from '../services/DateRangeService';
import { BaseMetricsCalculator } from '../services/BaseMetricsCalculator';
import { CardMetricResponse, PieMetricResponse, PeriodType, DateRangeFilter, HeatmapResponse, ProviderZonesResponse, HeatmapPoint, ProviderZoneData } from '../types';
import { AppDataSource } from '../config/database';
import { Solicitud } from '../models/Solicitud';
import { Cotizacion } from '../models/Cotizacion';
import { Pago } from '../models/Pago';
import { Usuario } from '../models/Usuario';
import { Habilidad } from '../models/Habilidad';
import { Prestador } from '../models/Prestador';
import { Rubro } from '../models/Rubro';

export class MetricsController extends BaseMetricsCalculator {
  
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

  private async handleError(res: Response, error: any, context: string): Promise<void> {
    logger.error(`Error in ${context}:`, error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // ========== 📱 APP DE BÚSQUEDA Y SOLICITUDES ==========

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

      const metric = this.calculateCardMetric(currentValue, previousValue, 'porcentaje');
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          return await this.countSolicitudesByEstado('creada', start, end);
        }
      );
      
      metric.chartData = chartData;
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

      const metric = this.calculateCardMetric(
        Math.round(currentRate * 100) / 100,
        Math.round(previousRate * 100) / 100,
        'absoluto'
      );
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          const creadasInt = await this.countSolicitudesByEstado('creada', start, end);
          const canceladasInt = await this.countSolicitudesByEstado('cancelada', start, end);
          return creadasInt > 0 ? (canceladasInt / creadasInt) * 100 : 0;
        }
      );
      
      metric.chartData = chartData;
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

      const metric = this.calculateCardMetric(currentAvg, previousAvg, 'absoluto');
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          return await this.calculateAverageTimeToFirstQuote(start, end);
        }
      );
      
      metric.chartData = chartData;
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

      const metric = this.calculateCardMetric(
        Math.round(currentRate * 100) / 100,
        Math.round(previousRate * 100) / 100,
        'absoluto'
      );
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          const aceptadasInt = await this.countCotizacionesByEstado('aceptada', start, end);
          const rechazadasInt = await this.countCotizacionesByEstado('rechazada', start, end);
          const totalInt = aceptadasInt + rechazadasInt;
          return totalInt > 0 ? (aceptadasInt / totalInt) * 100 : 0;
        }
      );
      
      metric.chartData = chartData;
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getConversionCotizacionAceptada');
    }
  }

  // ========== 💳 PAGOS Y FACTURACIÓN ==========

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

      const metric = this.calculateCardMetric(
        Math.round(currentRate * 100) / 100,
        Math.round(previousRate * 100) / 100,
        'absoluto'
      );
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          const aprobadosInt = await this.countPagosByEstado('approved', start, end);
          const rechazadosInt = await this.countPagosByEstado('rejected', start, end);
          const expiradosInt = await this.countPagosByEstado('expired', start, end);
          const totalInt = aprobadosInt + rechazadosInt + expiradosInt;
          return totalInt > 0 ? (aprobadosInt / totalInt) * 100 : 0;
        }
      );
      
      metric.chartData = chartData;
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

      const metric = this.calculateCardMetric(currentAvg, previousAvg, 'absoluto');
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          return await this.calculateAverageProcessingTimePagos(start, end);
        }
      );
      
      metric.chartData = chartData;
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
        Math.round(ingresoBruto * 100) / 100,
        Math.round(prevIngresoBruto * 100) / 100,
        'absoluto'
      );
      const ticketMedioMetric = this.calculateCardMetric(
        Math.round(ticketMedio * 100) / 100,
        Math.round(prevTicketMedio * 100) / 100,
        'absoluto'
      );

      // Agregar datos históricos para gráficos de línea
      const ingresoBrutoChartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          return await this.sumMontoPagosAprobados(start, end);
        }
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

  // ========== 👥 USUARIOS Y ROLES ==========

  /**
   * GET /api/metrica/usuarios/nuevos-clientes
   * 11. Nuevos clientes registrados
   */
  public async getNuevosClientes(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const currentValue = await this.countUsuariosByRol('customer', dateRanges.startDate, dateRanges.endDate);
      const previousValue = await this.countUsuariosByRol('customer', dateRanges.previousStartDate, dateRanges.previousEndDate);

      const metric = this.calculateCardMetric(currentValue, previousValue, 'porcentaje');
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          return await this.countUsuariosByRol('customer', start, end);
        }
      );
      
      metric.chartData = chartData;
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getNuevosClientes');
    }
  }

  /**
   * GET /api/metrica/usuarios/nuevos-prestadores
   * 11. Nuevos prestadores registrados
   */
  public async getNuevosPrestadoresUsuarios(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const currentValue = await this.countUsuariosByRol('prestador', dateRanges.startDate, dateRanges.endDate);
      const previousValue = await this.countUsuariosByRol('prestador', dateRanges.previousStartDate, dateRanges.previousEndDate);

      const metric = this.calculateCardMetric(currentValue, previousValue, 'porcentaje');
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          return await this.countUsuariosByRol('prestador', start, end);
        }
      );
      
      metric.chartData = chartData;
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getNuevosPrestadoresUsuarios');
    }
  }

  /**
   * GET /api/metrica/usuarios/nuevos-administradores
   * 11. Nuevos administradores registrados
   */
  public async getNuevosAdministradores(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const currentValue = await this.countUsuariosByRol('admin', dateRanges.startDate, dateRanges.endDate);
      const previousValue = await this.countUsuariosByRol('admin', dateRanges.previousStartDate, dateRanges.previousEndDate);

      const metric = this.calculateCardMetric(currentValue, previousValue, 'porcentaje');
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          return await this.countUsuariosByRol('admin', start, end);
        }
      );
      
      metric.chartData = chartData;
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getNuevosAdministradores');
    }
  }

  /**
   * GET /api/metrica/usuarios/tasa-roles-activos
   * 12. Tasa de roles activos (%)
   */
  public async getTasaRolesActivos(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const repo = AppDataSource.getRepository(Usuario);
      
      const total = await repo
        .createQueryBuilder('usuario')
        .where('usuario.timestamp >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('usuario.timestamp <= :endDate', { endDate: dateRanges.endDate })
        .getCount();

      const activos = await repo
        .createQueryBuilder('usuario')
        .where('usuario.estado = :estado', { estado: 'activo' })
        .andWhere('usuario.timestamp >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('usuario.timestamp <= :endDate', { endDate: dateRanges.endDate })
        .getCount();

      const currentRate = total > 0 ? (activos / total) * 100 : 0;

      const prevTotal = await repo
        .createQueryBuilder('usuario')
        .where('usuario.timestamp >= :startDate', { startDate: dateRanges.previousStartDate })
        .andWhere('usuario.timestamp <= :endDate', { endDate: dateRanges.previousEndDate })
        .getCount();

      const prevActivos = await repo
        .createQueryBuilder('usuario')
        .where('usuario.estado = :estado', { estado: 'activo' })
        .andWhere('usuario.timestamp >= :startDate', { startDate: dateRanges.previousStartDate })
        .andWhere('usuario.timestamp <= :endDate', { endDate: dateRanges.previousEndDate })
        .getCount();

      const previousRate = prevTotal > 0 ? (prevActivos / prevTotal) * 100 : 0;

      // También devolver distribución por rol
      const porRol = await repo
        .createQueryBuilder('usuario')
        .select('usuario.rol', 'rol')
        .addSelect('COUNT(*)', 'total')
        .where('usuario.estado = :estado', { estado: 'activo' })
        .andWhere('usuario.timestamp >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('usuario.timestamp <= :endDate', { endDate: dateRanges.endDate })
        .groupBy('usuario.rol')
        .getRawMany();

      const distribution: PieMetricResponse = {};
      porRol.forEach(row => {
        distribution[row.rol] = parseInt(row.total);
      });

      // Calcular métrica usando el método estándar
      const tasaActivosMetric = this.calculateCardMetric(
        Math.round(currentRate * 100) / 100,
        Math.round(previousRate * 100) / 100,
        'absoluto'
      );

      res.status(200).json({
        success: true,
        data: {
          tasaActivos: tasaActivosMetric,
          distribucionPorRol: distribution
        }
      });
    } catch (error) {
      await this.handleError(res, error, 'getTasaRolesActivos');
    }
  }


  // ========== 🔄 MATCHING Y AGENDA ==========

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

      const metric = this.calculateCardMetric(currentAvg, previousAvg, 'absoluto');
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          return await this.calculateAverageMatchingTime(start, end);
        }
      );
      
      metric.chartData = chartData;
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

      // Cotizaciones pendientes son las emitidas que no están aceptadas ni rechazadas ni expiradas
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

      const metric = this.calculateCardMetric(pendientes, prevPendientes, 'porcentaje');
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          return await repo
            .createQueryBuilder('cotizacion')
            .where('cotizacion.estado = :estado', { estado: 'emitida' })
            .andWhere('cotizacion.timestamp >= :startDate', { startDate: start })
            .andWhere('cotizacion.timestamp <= :endDate', { endDate: end })
            .getCount();
        }
      );
      
      metric.chartData = chartData;
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

      const metric = this.calculateCardMetric(currentAvg, previousAvg, 'absoluto');
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          return await this.calculateAverageProviderResponseTime(start, end);
        }
      );
      
      metric.chartData = chartData;
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
      const emitidas = await this.countCotizacionesByEstado('emitida', dateRanges.startDate, dateRanges.endDate);
      const totalEmitidas = expiradas + emitidas; // También incluir aceptadas y rechazadas para el total real
      const todasEmitidas = await this.countCotizaciones(dateRanges.startDate, dateRanges.endDate);
      const currentRate = todasEmitidas > 0 ? (expiradas / todasEmitidas) * 100 : 0;

      const prevExpiradas = await this.countCotizacionesByEstado('expirada', dateRanges.previousStartDate, dateRanges.previousEndDate);
      const prevTodasEmitidas = await this.countCotizaciones(dateRanges.previousStartDate, dateRanges.previousEndDate);
      const previousRate = prevTodasEmitidas > 0 ? (prevExpiradas / prevTodasEmitidas) * 100 : 0;

      const metric = this.calculateCardMetric(
        Math.round(currentRate * 100) / 100,
        Math.round(previousRate * 100) / 100,
        'absoluto'
      );
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getTasaCotizacionesExpiradas');
    }
  }


  // ========== ENDPOINTS LEGACY (mantener compatibilidad) ==========

  /**
   * GET /api/metrica/usuarios/creados (legacy)
   */
  public async getUsuariosCreados(req: Request, res: Response): Promise<void> {
    await this.getNuevosClientes(req, res);
  }

  /**
   * GET /api/metrica/prestadores/registrados (legacy)
   */
  public async getPrestadoresRegistrados(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const currentValue = await this.countUsuariosByRol('prestador', dateRanges.startDate, dateRanges.endDate);
      const previousValue = await this.countUsuariosByRol('prestador', dateRanges.previousStartDate, dateRanges.previousEndDate);

      const metric = this.calculateCardMetric(currentValue, previousValue, 'porcentaje');
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getPrestadoresRegistrados');
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
    await this.getTiempoPrimeraCotizacion(req, res);
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

  /**
   * GET /api/metrica/prestadores/zonas (legacy)
   */
  public async getPrestadoresZonas(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const usuariosRepo = AppDataSource.getRepository(Usuario);
      const habilidadesRepo = AppDataSource.getRepository(Habilidad);

      const prestadores = await usuariosRepo
        .createQueryBuilder('usuario')
        .where('usuario.rol = :rol', { rol: 'prestador' })
        .andWhere('usuario.timestamp >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('usuario.timestamp <= :endDate', { endDate: dateRanges.endDate })
        .getMany();

      const zoneData: ProviderZoneData[] = [];

      for (const prestador of prestadores) {
        const habilidades = await habilidadesRepo.find({
          where: { id_usuario: prestador.id_usuario, activa: true }
        });

        habilidades.forEach(h => {
          zoneData.push({
            lat: -34.6037, // Coordenadas por defecto
            lon: -58.3816,
            providerType: h.nombre_habilidad,
            count: 1,
            zoneName: prestador.ubicacion || 'Sin zona'
          });
        });
      }

      const providerTypes = Array.from(new Set(zoneData.map(z => z.providerType)));

      const response: ProviderZonesResponse = {
        data: zoneData,
        totalProviders: prestadores.length,
        providerTypes,
        period: {
          startDate: dateRanges.startDate.toISOString(),
          endDate: dateRanges.endDate.toISOString()
        }
      };

      res.status(200).json({ success: true, data: response });
    } catch (error) {
      await this.handleError(res, error, 'getPrestadoresZonas');
    }
  }

  // ========== 📋 CATÁLOGO DE SERVICIOS Y PRESTADORES ==========

  /**
   * GET /api/metrica/prestadores/nuevos-registrados
   * 1. Nuevos prestadores registrados
   */
  public async getNuevosPrestadoresRegistrados(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const currentValue = await this.countPrestadoresByEstado('activo', dateRanges.startDate, dateRanges.endDate);
      const previousValue = await this.countPrestadoresByEstado('activo', dateRanges.previousStartDate, dateRanges.previousEndDate);

      const metric = this.calculateCardMetric(currentValue, previousValue, 'porcentaje');
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          return await this.countPrestadoresByEstado('activo', start, end);
        }
      );
      
      metric.chartData = chartData;
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getNuevosPrestadoresRegistrados');
    }
  }

  /**
   * GET /api/metrica/prestadores/total-activos
   * 2. Cantidad total de prestadores activos
   */
  public async getTotalPrestadoresActivos(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const currentValue = await this.countPrestadoresActivos();
      const previousDate = new Date(dateRanges.previousEndDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousValue = await AppDataSource.getRepository(Prestador)
        .createQueryBuilder('prestador')
        .where('prestador.estado = :estado', { estado: 'activo' })
        .andWhere('prestador.timestamp <= :previousDate', { previousDate })
        .getCount();

      const metric = this.calculateCardMetric(currentValue, previousValue, 'porcentaje');
      
      // Agregar datos históricos para gráfico de línea (cuenta total activos en cada punto)
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          // Contar prestadores activos hasta ese momento
          return await AppDataSource.getRepository(Prestador)
            .createQueryBuilder('prestador')
            .where('prestador.estado = :estado', { estado: 'activo' })
            .andWhere('prestador.timestamp <= :endDate', { endDate: end })
            .getCount();
        }
      );
      
      metric.chartData = chartData;
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getTotalPrestadoresActivos');
    }
  }

  /**
   * GET /api/metrica/prestadores/win-rate
   * 5. Win Rate por rubro (%)
   * Nota: Calcula el Win Rate global ya que no hay relación directa entre cotizaciones y rubros en el modelo actual
   */
  public async getWinRatePorRubro(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      // Calcular Win Rate global (todas las cotizaciones)
      const cotizacionesRepo = AppDataSource.getRepository(Cotizacion);
      
      const emitidas = await cotizacionesRepo
        .createQueryBuilder('cotizacion')
        .where('cotizacion.estado = :estado', { estado: 'emitida' })
        .andWhere('cotizacion.timestamp >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('cotizacion.timestamp <= :endDate', { endDate: dateRanges.endDate })
        .getCount();

      const aceptadas = await cotizacionesRepo
        .createQueryBuilder('cotizacion')
        .where('cotizacion.estado = :estado', { estado: 'aceptada' })
        .andWhere('cotizacion.timestamp >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('cotizacion.timestamp <= :endDate', { endDate: dateRanges.endDate })
        .getCount();

      const currentRate = emitidas > 0 ? (aceptadas / emitidas) * 100 : 0;

      // Calcular para período anterior
      const prevEmitidas = await cotizacionesRepo
        .createQueryBuilder('cotizacion')
        .where('cotizacion.estado = :estado', { estado: 'emitida' })
        .andWhere('cotizacion.timestamp >= :startDate', { startDate: dateRanges.previousStartDate })
        .andWhere('cotizacion.timestamp <= :endDate', { endDate: dateRanges.previousEndDate })
        .getCount();

      const prevAceptadas = await cotizacionesRepo
        .createQueryBuilder('cotizacion')
        .where('cotizacion.estado = :estado', { estado: 'aceptada' })
        .andWhere('cotizacion.timestamp >= :startDate', { startDate: dateRanges.previousStartDate })
        .andWhere('cotizacion.timestamp <= :endDate', { endDate: dateRanges.previousEndDate })
        .getCount();

      const previousRate = prevEmitidas > 0 ? (prevAceptadas / prevEmitidas) * 100 : 0;

      const metric = this.calculateCardMetric(
        Math.round(currentRate * 100) / 100,
        Math.round(previousRate * 100) / 100,
        'absoluto'
      );
      
      // Agregar datos históricos para gráfico de línea
      const chartData = await this.calculateHistoricalData(
        periodType,
        dateRanges,
        async (start: Date, end: Date) => {
          const emitidasInt = await cotizacionesRepo
            .createQueryBuilder('cotizacion')
            .where('cotizacion.estado = :estado', { estado: 'emitida' })
            .andWhere('cotizacion.timestamp >= :startDate', { startDate: start })
            .andWhere('cotizacion.timestamp <= :endDate', { endDate: end })
            .getCount();
          
          const aceptadasInt = await cotizacionesRepo
            .createQueryBuilder('cotizacion')
            .where('cotizacion.estado = :estado', { estado: 'aceptada' })
            .andWhere('cotizacion.timestamp >= :startDate', { startDate: start })
            .andWhere('cotizacion.timestamp <= :endDate', { endDate: end })
            .getCount();
          
          return emitidasInt > 0 ? (aceptadasInt / emitidasInt) * 100 : 0;
        }
      );
      
      metric.chartData = chartData;
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getWinRatePorRubro');
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
   * GET /api/metrica/servicios/distribucion
   * 7. Distribución de servicios
   */
  public async getDistribucionServicios(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      // Contar solicitudes agrupadas por habilidad (que representa el tipo de servicio)
      const habilidadesRepo = AppDataSource.getRepository(Habilidad);
      const solicitudesRepo = AppDataSource.getRepository(Solicitud);

      const solicitudes = await solicitudesRepo
        .createQueryBuilder('solicitud')
        .where('solicitud.timestamp >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('solicitud.timestamp <= :endDate', { endDate: dateRanges.endDate })
        .getMany();

      // Agrupar por habilidad asociada (necesitaríamos relación entre solicitud y habilidad)
      // Por ahora agrupar por nombre de habilidad si está disponible en las solicitudes
      const distribution: PieMetricResponse = {};

      // Si las solicitudes tienen información de habilidad, agrupar por eso
      // Si no, usar rubros o categorías
      const habilidades = await habilidadesRepo.find();
      
      for (const habilidad of habilidades) {
        const count = await solicitudesRepo
          .createQueryBuilder('solicitud')
          .innerJoin('habilidades', 'hab', 'hab.id_usuario = solicitud.id_prestador')
          .where('hab.id_habilidad = :idHabilidad', { idHabilidad: habilidad.id_habilidad })
          .andWhere('solicitud.timestamp >= :startDate', { startDate: dateRanges.startDate })
          .andWhere('solicitud.timestamp <= :endDate', { endDate: dateRanges.endDate })
          .getCount();
        
        if (count > 0) {
          distribution[habilidad.nombre_habilidad] = count;
        }
      }

      res.status(200).json({ success: true, data: distribution });
    } catch (error) {
      await this.handleError(res, error, 'getDistribucionServicios');
    }
  }
}
