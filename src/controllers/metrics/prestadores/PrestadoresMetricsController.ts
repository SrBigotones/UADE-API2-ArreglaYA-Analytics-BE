import { Request, Response } from 'express';
import { logger } from '../../../config/logger';
import { DateRangeService } from '../../../services/DateRangeService';
import { BaseMetricsCalculator } from '../../../services/BaseMetricsCalculator';
import { PeriodType, PieMetricResponse, ProviderZonesResponse, ProviderZoneData, SegmentationFilters } from '../../../types';
import { AppDataSource } from '../../../config/database';
import { Prestador } from '../../../models/Prestador';
import { Cotizacion } from '../../../models/Cotizacion';
import { Solicitud } from '../../../models/Solicitud';
import { Habilidad } from '../../../models/Habilidad';
import { Usuario } from '../../../models/Usuario';

export class PrestadoresMetricsController extends BaseMetricsCalculator {
  
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
    const { rubro, zona } = req.query;
    
    if (!rubro && !zona) {
      return undefined;
    }

    const filters: SegmentationFilters = {};
    
    if (rubro) {
      filters.rubro = isNaN(Number(rubro)) ? rubro as string : Number(rubro);
    }
    
    if (zona) {
      filters.zona = zona as string;
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
   * GET /api/metrica/prestadores/nuevos-registrados
   * 1. Nuevos prestadores registrados
   * Segmentar por: Zona, rubro
   */
  public async getNuevosPrestadoresRegistrados(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const currentValue = await this.countPrestadoresByEstado('activo', dateRanges.startDate, dateRanges.endDate, filters);
      const previousValue = await this.countPrestadoresByEstado('activo', dateRanges.previousStartDate, dateRanges.previousEndDate, filters);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentValue,
        previousValue,
        async (start: Date, end: Date) => this.countPrestadoresByEstado('activo', start, end, filters),
        'porcentaje'
      );
      
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

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentValue,
        previousValue,
        async (start: Date, end: Date) => {
          return await AppDataSource.getRepository(Prestador)
            .createQueryBuilder('prestador')
            .where('prestador.estado = :estado', { estado: 'activo' })
            .andWhere('prestador.timestamp <= :endDate', { endDate: end })
            .getCount();
        },
        'porcentaje'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getTotalPrestadoresActivos');
    }
  }

  /**
   * GET /api/metrica/prestadores/win-rate-rubro
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

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        this.roundPercentage(currentRate),
        this.roundPercentage(previousRate),
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
        },
        'absoluto'
      );
      
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getWinRatePorRubro');
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
}

