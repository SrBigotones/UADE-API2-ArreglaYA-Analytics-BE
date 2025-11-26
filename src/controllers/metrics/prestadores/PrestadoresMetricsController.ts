import { Request, Response } from 'express';
import { logger } from '../../../config/logger';
import { DateRangeService } from '../../../services/DateRangeService';
import { BaseMetricsCalculator } from '../../../services/BaseMetricsCalculator';
import { PeriodType, PieMetricResponse, ProviderZonesResponse, ProviderZoneData, SegmentationFilters } from '../../../types';
import { AppDataSource } from '../../../config/database';
import { Prestador } from '../../../models/Prestador';
import { Solicitud } from '../../../models/Solicitud';
import { Habilidad } from '../../../models/Habilidad';
import { Usuario } from '../../../models/Usuario';
import { formatDateLocal } from '../../../utils/dateUtils';

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
   * Parsea y valida los parámetros de segmentación
   * Nota: Win Rate NO acepta filtros de segmentación (es general)
   */
  protected parseSegmentationParams(req: Request): SegmentationFilters | undefined {
    const { rubro, zona } = req.query;
    const filters: SegmentationFilters = {};

    if (rubro) {
      const rubroValue = typeof rubro === 'string' && !isNaN(Number(rubro)) ? Number(rubro) : rubro;
      filters.rubro = rubroValue as string | number;
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
   * GET /api/metrica/servicios/distribucion
   * 7. Distribución de servicios por cantidad de prestadores
   * Muestra cuántos prestadores ofrecen cada tipo de servicio/habilidad
   */
  public async getDistribucionServicios(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const habilidadesRepo = AppDataSource.getRepository(Habilidad);

      // Contar PRESTADORES (usuarios) por habilidad - muestra la oferta de servicios
      const qb = habilidadesRepo
        .createQueryBuilder('hab')
        .select('hab.nombre_habilidad', 'habilidad')
        .addSelect('COUNT(DISTINCT hab.id_usuario)', 'count')
        .where('hab.activa = true');  // Solo habilidades activas
      
      // Filtrar prestadores activos en el período seleccionado
      qb.innerJoin('usuarios', 'u', 'u.id_usuario = hab.id_usuario')
        .andWhere('u.created_at <= :endDate', { endDate: dateRanges.endDate });

      // Aplicar filtros de zona y rubro si existen
      if (filters && filters.zona) {
        // Usar la tabla zonas (relación many-to-many) en lugar de usuarios.ubicacion
        qb.innerJoin('zonas', 'zona', 'zona.id_usuario = hab.id_usuario AND zona.activa = true')
          .andWhere('zona.nombre_zona = :zona', { zona: filters.zona });
      }

      if (filters && filters.rubro) {
        qb.andWhere('hab.id_rubro = :rubro', { rubro: filters.rubro });
      }

      qb.groupBy('hab.id_habilidad, hab.nombre_habilidad')
        .having('COUNT(DISTINCT hab.id_usuario) > 0');

      const results = await qb.getRawMany();
      
      // Construir distribución raw
      const rawDistribution: Record<string, number> = {};
      results.forEach(row => {
        rawDistribution[row.habilidad] = parseInt(row.count);
      });

      // Aplicar estrategia Top N + umbral mínimo para evitar gráficos saturados
      const distribution = this.processTopNDistribution(rawDistribution, {
        topN: 12,              // Máximo 12 habilidades visibles
        minPercentage: 1.5,    // Solo mostrar si representa >= 1.5% del total
        othersLabel: 'Otros'   // Agrupar el resto en "Otros"
      });

      res.status(200).json({ success: true, data: distribution });
    } catch (error) {
      await this.handleError(res, error, 'getDistribucionServicios');
    }
  }

  /**
   * GET /api/metrica/prestadores/servicios/distribucion-por-rubro
   * 8. Distribución de prestadores por rubro
   * Muestra cuántos prestadores ofrecen servicios en cada rubro
   */
  public async getDistribucionServiciosPorRubro(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      const habilidadesRepo = AppDataSource.getRepository(Habilidad);

      // Contar PRESTADORES únicos por rubro
      // Agrupa habilidades → prestadores → rubros
      const qb = habilidadesRepo
        .createQueryBuilder('hab')
        .innerJoin('rubros', 'r', 'r.id_rubro = hab.id_rubro')
        .select('r.nombre_rubro', 'rubro')
        .addSelect('COUNT(DISTINCT hab.id_usuario)', 'count')
        .where('hab.activa = true')
        .andWhere('hab.id_rubro IS NOT NULL');  // Solo habilidades con rubro asignado
      
      // Filtrar prestadores activos en el período seleccionado
      qb.innerJoin('usuarios', 'u', 'u.id_usuario = hab.id_usuario')
        .andWhere('u.created_at <= :endDate', { endDate: dateRanges.endDate });

      // Aplicar filtro de zona si existe
      if (filters && filters.zona) {
        // Usar la tabla zonas (relación many-to-many) en lugar de usuarios.ubicacion
        qb.innerJoin('zonas', 'zona', 'zona.id_usuario = hab.id_usuario AND zona.activa = true')
          .andWhere('zona.nombre_zona = :zona', { zona: filters.zona });
      }

      // NOTA: No aplicar filtro de rubro aquí, ya que esta métrica ES la distribución por rubros

      qb.groupBy('r.id_rubro, r.nombre_rubro')
        .having('COUNT(DISTINCT hab.id_usuario) > 0');

      const results = await qb.getRawMany();
      
      // Construir distribución raw
      const rawDistribution: Record<string, number> = {};
      results.forEach(row => {
        rawDistribution[row.rubro] = parseInt(row.count);
      });

      // Aplicar estrategia Top N + umbral mínimo
      const distribution = this.processTopNDistribution(rawDistribution, {
        topN: 10,              // Máximo 10 rubros visibles
        minPercentage: 1.5,    // Solo mostrar si representa >= 1.5% del total
        othersLabel: 'Otros'
      });

      res.status(200).json({ success: true, data: distribution });
    } catch (error) {
      await this.handleError(res, error, 'getDistribucionServiciosPorRubro');
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
        .andWhere('usuario.created_at >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('usuario.created_at <= :endDate', { endDate: dateRanges.endDate })
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
          startDate: formatDateLocal(dateRanges.startDate),
          endDate: formatDateLocal(dateRanges.endDate)
        }
      };

      res.status(200).json({ success: true, data: response });
    } catch (error) {
      await this.handleError(res, error, 'getPrestadoresZonas');
    }
  }
}

