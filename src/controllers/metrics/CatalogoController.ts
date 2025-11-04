import { Request, Response } from 'express';
import { DateRangeService } from '../../services/DateRangeService';
import { BaseController } from './BaseController';
import { AppDataSource } from '../../config/database';
import { Prestador } from '../../models/Prestador';
import { Cotizacion } from '../../models/Cotizacion';
import { Solicitud } from '../../models/Solicitud';
import { Habilidad } from '../../models/Habilidad';
import { PieMetricResponse, HeatmapResponse, HeatmapPoint } from '../../types';

/**
 * Controlador para métricas de Catálogo de Servicios y Prestadores
 */
export class CatalogoController extends BaseController {
  
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

      const metric = await this.calculateMetricWithChart(
        periodType,
        dateRanges,
        currentValue,
        previousValue,
        async (start: Date, end: Date) => this.countPrestadoresByEstado('activo', start, end),
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
   */
  public async getWinRatePorRubro(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

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
   * GET /api/metrica/solicitudes/mapa-calor
   * 6. Mapa de calor de pedidos
   */
  public async getMapaCalorPedidos(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const solicitudesPorZona = await this.countSolicitudesPorZona(dateRanges.startDate, dateRanges.endDate);
      
      const points: HeatmapPoint[] = [];
      
      const solicitudes = await AppDataSource.getRepository(Solicitud)
        .createQueryBuilder('solicitud')
        .where('solicitud.timestamp >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('solicitud.timestamp <= :endDate', { endDate: dateRanges.endDate })
        .getMany();

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

      const habilidadesRepo = AppDataSource.getRepository(Habilidad);
      const solicitudesRepo = AppDataSource.getRepository(Solicitud);

      const solicitudes = await solicitudesRepo
        .createQueryBuilder('solicitud')
        .where('solicitud.timestamp >= :startDate', { startDate: dateRanges.startDate })
        .andWhere('solicitud.timestamp <= :endDate', { endDate: dateRanges.endDate })
        .getMany();

      const distribution: PieMetricResponse = {};

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

