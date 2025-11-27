import { Request, Response } from 'express';
import { logger } from '../../../config/logger';
import { DateRangeService } from '../../../services/DateRangeService';
import { BaseMetricsCalculator } from '../../../services/BaseMetricsCalculator';
import { PeriodType, SegmentationFilters } from '../../../types';
import { AppDataSource } from '../../../config/database';
import { Pago } from '../../../models/Pago';
import { Rubro } from '../../../models/Rubro';

export class RubrosMetricsController extends BaseMetricsCalculator {
  
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
   */
  protected parseSegmentationParams(req: Request): SegmentationFilters | undefined {
    const { zona, metodo, minMonto, maxMonto } = req.query;
    const filters: SegmentationFilters = {};

    if (zona) {
      filters.zona = zona as string;
    }

    if (metodo) {
      filters.metodo = metodo as string;
    }

    if (minMonto) {
      filters.minMonto = Number(minMonto);
      if (isNaN(filters.minMonto)) {
        throw new Error('minMonto debe ser un número válido');
      }
    }

    if (maxMonto) {
      filters.maxMonto = Number(maxMonto);
      if (isNaN(filters.maxMonto)) {
        throw new Error('maxMonto debe ser un número válido');
      }
    }

    return Object.keys(filters).length > 0 ? filters : undefined;
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
   * GET /api/metrica/rubros/ingresos-por-categoria
   * Retorna los ingresos totales agrupados por categoría (rubro) para el período seleccionado
   * Incluye comparación con período anterior y datos históricos
   */
  public async getIngresosPorCategoria(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);
      const filters = this.parseSegmentationParams(req);

      // Obtener ingresos por categoría para el período actual
      const ingresosActuales = await this.calcularIngresosPorRubro(
        dateRanges.startDate,
        dateRanges.endDate,
        filters
      );

      // Obtener ingresos por categoría para el período anterior
      const ingresosAnteriores = await this.calcularIngresosPorRubro(
        dateRanges.previousStartDate,
        dateRanges.previousEndDate,
        filters
      );

      // Construir respuesta con comparación
      const resultado = await this.buildIngresosPorCategoriaResponse(
        ingresosActuales,
        ingresosAnteriores,
        periodType,
        dateRanges,
        filters
      );

      res.status(200).json({ 
        success: true, 
        data: resultado
      });
    } catch (error) {
      await this.handleError(res, error, 'getIngresosPorCategoria');
    }
  }

  /**
   * Calcula los ingresos totales agrupados por rubro para un período específico
   */
  private async calcularIngresosPorRubro(
    startDate: Date,
    endDate: Date,
    filters?: SegmentationFilters
  ): Promise<Array<{ id_rubro: number; nombre_rubro: string; ingresos: number }>> {
    // Traer todos los pagos aprobados con su rubro, agrupando por pago y rubro
    const pagos = await AppDataSource
      .createQueryBuilder()
      .select('pago.id_pago', 'id_pago')
      .addSelect('pago.monto_total', 'monto_total')
      .addSelect('rubro.id_rubro', 'id_rubro')
      .addSelect('rubro.nombre_rubro', 'nombre_rubro')
      .from(Pago, 'pago')
      .leftJoin('solicitudes', 'solicitud', 'solicitud.id_solicitud = pago.id_solicitud')
      .leftJoin('habilidades', 'habilidad', 'habilidad.id_habilidad = solicitud.id_habilidad')
      .leftJoin('rubros', 'rubro', 'rubro.id_rubro = habilidad.id_rubro')
      .where('pago.estado = :estado', { estado: 'approved' })
      .andWhere('pago.timestamp_creado >= :startDate', { startDate })
      .andWhere('pago.timestamp_creado <= :endDate', { endDate })
      .andWhere('rubro.id_rubro IS NOT NULL')
      .andWhere(filters?.metodo ? 'pago.metodo = :metodo' : '1=1', { metodo: filters?.metodo })
      .andWhere(filters?.minMonto !== undefined ? 'pago.monto_total >= :minMonto' : '1=1', { minMonto: filters?.minMonto })
      .andWhere(filters?.maxMonto !== undefined ? 'pago.monto_total <= :maxMonto' : '1=1', { maxMonto: filters?.maxMonto })
      .getRawMany();

    // Agrupar en JS para sumar solo una vez cada pago por rubro
    const pagosUnicos = new Map<string, { id_pago: string, id_rubro: number, nombre_rubro: string, monto_total: number }>();
    for (const row of pagos) {
      if (!row.id_pago || !row.id_rubro || !row.nombre_rubro || !row.monto_total) continue;
      const key = `${row.id_pago}-${row.id_rubro}`;
      if (!pagosUnicos.has(key)) {
        pagosUnicos.set(key, {
          id_pago: row.id_pago,
          id_rubro: parseInt(row.id_rubro),
          nombre_rubro: row.nombre_rubro,
          monto_total: parseFloat(row.monto_total)
        });
      }
    }

    // Sumar ingresos por rubro
    const rubroMap = new Map<number, { id_rubro: number; nombre_rubro: string; ingresos: number }>();
    for (const pago of pagosUnicos.values()) {
      if (!rubroMap.has(pago.id_rubro)) {
        rubroMap.set(pago.id_rubro, { id_rubro: pago.id_rubro, nombre_rubro: pago.nombre_rubro, ingresos: 0 });
      }
      rubroMap.get(pago.id_rubro)!.ingresos += pago.monto_total;
    }

    return Array.from(rubroMap.values()).map(r => ({
      id_rubro: r.id_rubro,
      nombre_rubro: r.nombre_rubro,
      ingresos: Math.round(r.ingresos * 100) / 100
    }));
  }

  /**
   * Construye la respuesta completa con comparación y datos históricos
   */
  private async buildIngresosPorCategoriaResponse(
    ingresosActuales: Array<{ id_rubro: number; nombre_rubro: string; ingresos: number }>,
    ingresosAnteriores: Array<{ id_rubro: number; nombre_rubro: string; ingresos: number }>,
    periodType: PeriodType,
    dateRanges: any,
    filters?: SegmentationFilters
  ) {
    // Crear un mapa para los ingresos anteriores
    const ingresosAnterioresMap = new Map<number, number>();
    ingresosAnteriores.forEach(item => {
      ingresosAnterioresMap.set(item.id_rubro, item.ingresos);
    });

    // Construir respuesta con comparación para cada categoría
    const categorias = await Promise.all(
      ingresosActuales.map(async (categoria) => {
        const ingresoAnterior = ingresosAnterioresMap.get(categoria.id_rubro) || 0;
        
        // Calcular métrica de comparación
        const metric = this.calculateCardMetric(
          categoria.ingresos,
          ingresoAnterior,
          'absoluto'
        );

        // Calcular datos históricos para esta categoría
        const chartData = await this.calculateHistoricalData(
          periodType,
          dateRanges,
          async (start: Date, end: Date) => {
            const ingresosIntervalo = await this.calcularIngresosPorRubro(start, end, filters);
            const categoriaIntervalo = ingresosIntervalo.find(c => c.id_rubro === categoria.id_rubro);
            return categoriaIntervalo ? categoriaIntervalo.ingresos : 0;
          }
        );

        return {
          id_rubro: categoria.id_rubro,
          nombre_rubro: categoria.nombre_rubro,
          ingresos_actuales: categoria.ingresos,
          ingresos_anteriores: ingresoAnterior,
          cambio: metric.change,
          cambio_tipo: metric.changeType,
          cambio_estado: metric.changeStatus,
          datos_historicos: chartData
        };
      })
    );

    // Calcular totales
    const totalActual = ingresosActuales.reduce((sum, cat) => sum + cat.ingresos, 0);
    const totalAnterior = ingresosAnteriores.reduce((sum, cat) => sum + cat.ingresos, 0);
    const totalMetric = this.calculateCardMetric(totalActual, totalAnterior, 'absoluto');

    return {
      total: {
        ingresos_actuales: Math.round(totalActual * 100) / 100,
        ingresos_anteriores: Math.round(totalAnterior * 100) / 100,
        cambio: totalMetric.change,
        cambio_tipo: totalMetric.changeType,
        cambio_estado: totalMetric.changeStatus
      },
      categorias: categorias,
      periodo: {
        tipo: periodType.type,
        fecha_inicio: dateRanges.startDate.toISOString(),
        fecha_fin: dateRanges.endDate.toISOString()
      }
    };
  }
}
