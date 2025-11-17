import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Rubro } from '../models/Rubro';
import { Zona } from '../models/Zona';
import { logger } from '../config/logger';

/**
 * Controller para endpoints de catálogos
 * Provee listas de rubros, zonas, etc. para el frontend
 */
export class CatalogoController {
  /**
   * GET /api/catalogo/rubros
   * Obtiene la lista de todos los rubros activos
   */
  public async getRubros(req: Request, res: Response): Promise<void> {
    try {
      const rubroRepo = AppDataSource.getRepository(Rubro);

      // Obtener todos los rubros ordenados por nombre
      const rubros = await rubroRepo
        .createQueryBuilder('rubro')
        .select(['rubro.id_rubro', 'rubro.nombre_rubro'])
        .orderBy('rubro.nombre_rubro', 'ASC')
        .getMany();

      logger.info(`✅ Rubros fetched: ${rubros.length} rubros`);

      // Formatear respuesta para el frontend
      const response = rubros.map(rubro => ({
        id: rubro.id_rubro,
        nombre: rubro.nombre_rubro
      }));

      res.status(200).json({
        success: true,
        data: response,
        total: rubros.length
      });

    } catch (error) {
      logger.error('Error fetching rubros:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo rubros',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/catalogo/zonas
   * Obtiene la lista de zonas únicas (DISTINCT) de la tabla de relación prestador-zona
   * Solo incluye zonas activas
   */
  public async getZonas(req: Request, res: Response): Promise<void> {
    try {
      const zonaRepo = AppDataSource.getRepository(Zona);

      // Obtener zonas únicas (DISTINCT) activas, ordenadas por nombre
      // NOTA: La tabla 'zonas' es una relación prestador-zona, no un catálogo independiente
      // Extraemos las zonas únicas basadas en id_zona y nombre_zona
      const zonasRaw = await zonaRepo
        .createQueryBuilder('zona')
        .select('zona.id_zona', 'id_zona')
        .addSelect('zona.nombre_zona', 'nombre_zona')
        .where('zona.activa = :activa', { activa: true })
        .groupBy('zona.id_zona')
        .addGroupBy('zona.nombre_zona')
        .orderBy('zona.nombre_zona', 'ASC')
        .getRawMany();

      logger.info(`✅ Zonas fetched: ${zonasRaw.length} zonas únicas`);

      // Formatear respuesta para el frontend
      const response = zonasRaw.map(zona => ({
        id: parseInt(zona.id_zona),
        nombre: zona.nombre_zona
      }));

      res.status(200).json({
        success: true,
        data: response,
        total: zonasRaw.length
      });

    } catch (error) {
      logger.error('Error fetching zonas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo zonas',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/catalogo/zonas-solicitudes
   * Obtiene la lista de zonas únicas (DISTINCT) desde las solicitudes
   * Retorna las zonas realmente usadas en solicitudes para filtros
   */
  public async getZonasSolicitudes(req: Request, res: Response): Promise<void> {
    try {
      // Obtener zonas únicas desde solicitudes donde zona NO es NULL
      const zonasRaw = await AppDataSource
        .createQueryBuilder()
        .select('DISTINCT solicitudes.zona', 'zona')
        .from('solicitudes', 'solicitudes')
        .where('solicitudes.zona IS NOT NULL')
        .andWhere("solicitudes.zona != ''")
        .orderBy('solicitudes.zona', 'ASC')
        .getRawMany();

      logger.info(`✅ Zonas solicitudes fetched: ${zonasRaw.length} zonas únicas`);

      // Formatear respuesta para el frontend (sin ID porque es varchar)
      const response = zonasRaw.map(z => z.zona);

      res.status(200).json({
        success: true,
        data: response,
        total: zonasRaw.length
      });

    } catch (error) {
      logger.error('Error fetching zonas solicitudes:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo zonas de solicitudes',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

