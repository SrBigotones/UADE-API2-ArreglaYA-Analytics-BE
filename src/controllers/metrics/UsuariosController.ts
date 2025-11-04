import { Request, Response } from 'express';
import { DateRangeService } from '../../services/DateRangeService';
import { BaseController } from './BaseController';
import { PieMetricResponse } from '../../types';
import { AppDataSource } from '../../config/database';
import { Usuario } from '../../models/Usuario';

/**
 * Controlador para métricas de Usuarios y Roles
 */
export class UsuariosController extends BaseController {
  
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
}

