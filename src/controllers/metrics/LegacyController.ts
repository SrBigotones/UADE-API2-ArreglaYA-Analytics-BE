import { Request, Response } from 'express';
import { DateRangeService } from '../../services/DateRangeService';
import { BaseController } from './BaseController';
import { AppDataSource } from '../../config/database';
import { Solicitud } from '../../models/Solicitud';
import { Usuario } from '../../models/Usuario';
import { Habilidad } from '../../models/Habilidad';
import { HeatmapResponse, ProviderZonesResponse, HeatmapPoint, ProviderZoneData } from '../../types';
import { SolicitudesController } from './SolicitudesController';
import { PagosController } from './PagosController';

/**
 * Controlador para endpoints legacy (compatibilidad con versiones anteriores)
 */
export class LegacyController extends BaseController {
  
  private solicitudesController = new SolicitudesController();
  private pagosController = new PagosController();

  /**
   * GET /api/metrica/usuarios/creados (legacy)
   */
  public async getUsuariosCreados(req: Request, res: Response): Promise<void> {
    // Delega al método de usuarios nuevos clientes
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const currentValue = await this.countUsuariosByRol('customer', dateRanges.startDate, dateRanges.endDate);
      const previousValue = await this.countUsuariosByRol('customer', dateRanges.previousStartDate, dateRanges.previousEndDate);

      const metric = this.calculateCardMetric(currentValue, previousValue, 'porcentaje');
      res.status(200).json({ success: true, data: metric });
    } catch (error) {
      await this.handleError(res, error, 'getUsuariosCreados');
    }
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
    await this.pagosController.getTasaExitoPagos(req, res);
  }

  /**
   * GET /api/metrica/pagos/distribucion (legacy)
   */
  public async getPagosDistribucion(req: Request, res: Response): Promise<void> {
    await this.pagosController.getDistribucionEventosPago(req, res);
  }

  /**
   * GET /api/metrica/pagos/tiempoProcesamiento (legacy)
   */
  public async getPagosTiempoProcesamiento(req: Request, res: Response): Promise<void> {
    await this.pagosController.getTiempoProcesamientoPagos(req, res);
  }

  /**
   * GET /api/metrica/matching/conversion (legacy)
   */
  public async getMatchingConversion(req: Request, res: Response): Promise<void> {
    await this.solicitudesController.getConversionCotizacionAceptada(req, res);
  }

  /**
   * GET /api/metrica/matching/lead-time (legacy)
   */
  public async getMatchingLeadTime(req: Request, res: Response): Promise<void> {
    await this.solicitudesController.getTiempoPrimeraCotizacion(req, res);
  }

  /**
   * GET /api/metrica/pedidos/mapa-calor (legacy)
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

      const zonasMap = new Map<string, number>();
      solicitudes.forEach(s => {
        if (s.zona) {
          zonasMap.set(s.zona, (zonasMap.get(s.zona) || 0) + 1);
        }
      });

      const heatmapPoints: HeatmapPoint[] = [];
      zonasMap.forEach((count, zona) => {
        heatmapPoints.push({
          lat: -34.6037,
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
            lat: -34.6037,
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

