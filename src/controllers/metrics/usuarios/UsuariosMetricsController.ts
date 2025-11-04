import { Request, Response } from 'express';
import { logger } from '../../../config/logger';
import { DateRangeService } from '../../../services/DateRangeService';
import { BaseMetricsCalculator } from '../../../services/BaseMetricsCalculator';
import { PeriodType, PieMetricResponse } from '../../../types';
import { AppDataSource } from '../../../config/database';
import { Usuario } from '../../../models/Usuario';

export class UsuariosMetricsController extends BaseMetricsCalculator {
  
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
   * GET /api/metrica/usuarios/nuevos-clientes
   * 11. Nuevos clientes registrados
   */
  public async getNuevosClientes(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const currentValue = await this.countUsuariosByRol('customer', dateRanges.startDate, dateRanges.endDate);
      const previousValue = await this.countUsuariosByRol('customer', dateRanges.previousStartDate, dateRanges.previousEndDate);

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentValue,
        previousValue,
        async (start: Date, end: Date) => this.countUsuariosByRol('customer', start, end),
        'porcentaje'
      );
      
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

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentValue,
        previousValue,
        async (start: Date, end: Date) => this.countUsuariosByRol('prestador', start, end),
        'porcentaje'
      );
      
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

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentValue,
        previousValue,
        async (start: Date, end: Date) => this.countUsuariosByRol('admin', start, end),
        'porcentaje'
      );
      
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
        this.roundPercentage(currentRate),
        this.roundPercentage(previousRate),
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
}

