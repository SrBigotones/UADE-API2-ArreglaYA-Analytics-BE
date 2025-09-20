import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { DateRangeService } from '../services/DateRangeService';
import { BaseMetricsCalculator } from '../services/BaseMetricsCalculator';
import { CardMetricResponse, PieMetricResponse, PeriodType, DateRangeFilter, HeatmapResponse, ProviderZonesResponse, HeatmapPoint, ProviderZoneData } from '../types';

export class MetricsController extends BaseMetricsCalculator {
  
  /**
   * Calcula la tasa de éxito de pagos como porcentaje
   * @param startDate - Fecha de inicio
   * @param endDate - Fecha de fin
   * @returns Tasa de éxito como porcentaje (0-100)
   */
  private async calculatePaymentSuccessRate(startDate: Date, endDate: Date): Promise<number> {
    // Obtener todos los pagos creados en el período
    const createdPayments = await this.getEventsByType(
      'payment.created',
      startDate,
      endDate
    );

    if (createdPayments.length === 0) {
      return 0;
    }

    // Obtener todos los eventos de finalización (aprobados, rechazados, expirados)
    const [approvedPayments, rejectedPayments, expiredPayments] = await Promise.all([
      this.getEventsByType('payment.approved', startDate, endDate),
      this.getEventsByType('payment.rejected', startDate, endDate),
      this.getEventsByType('payment.expired', startDate, endDate)
    ]);

    // Crear sets de correlationIds para cada estado final
    const approvedIds = new Set(
      approvedPayments
        .filter(p => p.correlationId)
        .map(p => p.correlationId!)
    );

    const rejectedIds = new Set(
      rejectedPayments
        .filter(p => p.correlationId)
        .map(p => p.correlationId!)
    );

    const expiredIds = new Set(
      expiredPayments
        .filter(p => p.correlationId)
        .map(p => p.correlationId!)
    );

    // Contar pagos por estado, considerando solo los que se crearon en el período
    let successfulCount = 0;
    let completedCount = 0; // Total de pagos que llegaron a un estado final

    for (const createdPayment of createdPayments) {
      if (createdPayment.correlationId) {
        const correlationId = createdPayment.correlationId;
        
        if (approvedIds.has(correlationId)) {
          successfulCount++;
          completedCount++;
        } else if (rejectedIds.has(correlationId) || expiredIds.has(correlationId)) {
          completedCount++;
        }
        // Los pendientes no se cuentan en el total completado
      }
    }

    if (completedCount === 0) {
      return 0;
    }

    // Calcular tasa de éxito como porcentaje
    const successRate = (successfulCount / completedCount) * 100;
    return Math.round(successRate * 100) / 100; // Redondear a 2 decimales
  }

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
   * GET /api/metrica/usuarios/creados
   * Métricas de usuarios creados (tipo card)
   */
  public async getUsuariosCreados(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const metric = await this.calculateSimpleCardMetric(
        'users.created',
        dateRanges,
        'porcentaje'
      );

      res.status(200).json({
        success: true,
        data: metric
      });

    } catch (error) {
      logger.error('Error getting usuarios creados metrics:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/metrica/prestadores/registrados
   * Métricas de prestadores registrados (tipo card)
   */
  public async getPrestadoresRegistrados(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      const metric = await this.calculateSimpleCardMetric(
        'service.providers.created',
        dateRanges,
        'porcentaje'
      );

      res.status(200).json({
        success: true,
        data: metric
      });

    } catch (error) {
      logger.error('Error getting prestadores registrados metrics:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/metrica/pagos/exitosos
   * Métricas de tasa de éxito de pagos (tipo card)
   */
  public async getPagosExitosos(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      // Calcular tasa de éxito para el período actual
      const currentSuccessRate = await this.calculatePaymentSuccessRate(
        dateRanges.startDate,
        dateRanges.endDate
      );

      // Calcular tasa de éxito para el período anterior
      const previousSuccessRate = await this.calculatePaymentSuccessRate(
        dateRanges.previousStartDate,
        dateRanges.previousEndDate
      );

      const metric = this.calculateCardMetric(
        currentSuccessRate,
        previousSuccessRate,
        'absoluto' // Cambio a absoluto porque ya es un porcentaje
      );

      res.status(200).json({
        success: true,
        data: metric
      });

    } catch (error) {
      logger.error('Error getting pagos exitosos metrics:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/metrica/pagos/distribucion
   * Distribución de pagos por estado (tipo pie)
   */
  public async getPagosDistribucion(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      // Obtener todos los pagos creados en el período
      const createdPayments = await this.getEventsByType(
        'payment.created',
        dateRanges.startDate,
        dateRanges.endDate
      );

      // Obtener eventos de estado final
      const approvedPayments = await this.getEventsByType(
        'payment.approved',
        dateRanges.startDate,
        dateRanges.endDate
      );

      const rejectedPayments = await this.getEventsByType(
        'payment.rejected',
        dateRanges.startDate,
        dateRanges.endDate
      );

      const expiredPayments = await this.getEventsByType(
        'payment.expired',
        dateRanges.startDate,
        dateRanges.endDate
      );

      // Crear sets de correlationIds para estados finales
      const approvedIds = new Set(
        approvedPayments
          .filter(p => p.correlationId)
          .map(p => p.correlationId!)
      );

      const rejectedIds = new Set(
        rejectedPayments
          .filter(p => p.correlationId)
          .map(p => p.correlationId!)
      );

      const expiredIds = new Set(
        expiredPayments
          .filter(p => p.correlationId)
          .map(p => p.correlationId!)
      );

      // Contar distribución
      let approved = 0;
      let rejected = 0;
      let expired = 0;
      let pending = 0;

      for (const createdPayment of createdPayments) {
        if (createdPayment.correlationId) {
          const correlationId = createdPayment.correlationId;
          
          if (approvedIds.has(correlationId)) {
            approved++;
          } else if (rejectedIds.has(correlationId)) {
            rejected++;
          } else if (expiredIds.has(correlationId)) {
            expired++;
          } else {
            pending++;
          }
        }
      }

      const distribution: PieMetricResponse = {
        'APROBADO': approved,
        'RECHAZADO': rejected,
        'EXPIRADO': expired,
        'PENDIENTE': pending
      };

      res.status(200).json({
        success: true,
        data: distribution
      });

    } catch (error) {
      logger.error('Error getting pagos distribución metrics:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/metrica/pagos/tiempoProcesamiento
   * Tiempo promedio de procesamiento de pagos (tipo card)
   */
  public async getPagosTiempoProcesamiento(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      // Período actual
      const currentApprovedPayments = await this.getEventsByType(
        'payment.approved',
        dateRanges.startDate,
        dateRanges.endDate
      );

      const currentCreatedPayments = await this.getEventsByType(
        'payment.created',
        dateRanges.startDate,
        dateRanges.endDate
      );

      const currentCompleteLifecycle = this.getCompleteLifecycleEvents(
        currentCreatedPayments,
        currentApprovedPayments,
        dateRanges.startDate,
        dateRanges.endDate
      );

      const currentAvgTime = this.calculateAverageProcessingTime(
        currentCompleteLifecycle.created,
        currentCompleteLifecycle.completed
      );

      // Período anterior
      const previousApprovedPayments = await this.getEventsByType(
        'payment.approved',
        dateRanges.previousStartDate,
        dateRanges.previousEndDate
      );

      const previousCreatedPayments = await this.getEventsByType(
        'payment.created',
        dateRanges.previousStartDate,
        dateRanges.previousEndDate
      );

      const previousCompleteLifecycle = this.getCompleteLifecycleEvents(
        previousCreatedPayments,
        previousApprovedPayments,
        dateRanges.previousStartDate,
        dateRanges.previousEndDate
      );

      const previousAvgTime = this.calculateAverageProcessingTime(
        previousCompleteLifecycle.created,
        previousCompleteLifecycle.completed
      );

      const metric = this.calculateCardMetric(
        currentAvgTime,
        previousAvgTime,
        'absoluto'
      );

      res.status(200).json({
        success: true,
        data: metric
      });

    } catch (error) {
      logger.error('Error getting pagos tiempo procesamiento metrics:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/metrica/pedidos/mapa-calor
   * Mapa de calor de pedidos por ubicación
   */
  public async getPedidosMapaCalor(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      // Obtener eventos de pedidos creados
      const orderEvents = await this.getEventsByType(
        'orders.created',
        dateRanges.startDate,
        dateRanges.endDate
      );

      // Procesar eventos para extraer ubicaciones y crear puntos de calor
      const heatmapPoints: HeatmapPoint[] = [];
      const locationCounts = new Map<string, { lat: number; lon: number; count: number }>();

      for (const event of orderEvents) {
        // Extraer coordenadas del cuerpo del evento
        const location = this.extractLocationFromEvent(event);
        if (location) {
          const key = `${location.lat},${location.lon}`;
          
          if (locationCounts.has(key)) {
            locationCounts.get(key)!.count++;
          } else {
            locationCounts.set(key, {
              lat: location.lat,
              lon: location.lon,
              count: 1
            });
          }
        }
      }

      // Convertir a formato de puntos de calor
      for (const [, data] of locationCounts) {
        heatmapPoints.push({
          lat: data.lat,
          lon: data.lon,
          intensity: data.count
        });
      }

      const response: HeatmapResponse = {
        data: heatmapPoints,
        totalPoints: heatmapPoints.length,
        period: {
          startDate: dateRanges.startDate.toISOString(),
          endDate: dateRanges.endDate.toISOString()
        }
      };

      res.status(200).json({
        success: true,
        data: response
      });

    } catch (error) {
      logger.error('Error getting pedidos mapa calor:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/metrica/prestadores/zonas
   * Tipos de prestadores por zonas geográficas
   */
  public async getPrestadoresZonas(req: Request, res: Response): Promise<void> {
    try {
      const periodType = this.parsePeriodParams(req);
      const dateRanges = DateRangeService.getPeriodRanges(periodType);

      // Obtener eventos de prestadores creados
      const providerEvents = await this.getEventsByType(
        'service.providers.created',
        dateRanges.startDate,
        dateRanges.endDate
      );

      // Procesar eventos para extraer ubicaciones y tipos de prestadores
      const zoneData: ProviderZoneData[] = [];
      const providerTypeCounts = new Map<string, Map<string, { lat: number; lon: number; count: number }>>();

      for (const event of providerEvents) {
        const location = this.extractLocationFromEvent(event);
        const providerType = this.extractProviderTypeFromEvent(event);
        
        if (location && providerType) {
          const key = `${location.lat},${location.lon}`;
          
          if (!providerTypeCounts.has(providerType)) {
            providerTypeCounts.set(providerType, new Map());
          }
          
          const typeMap = providerTypeCounts.get(providerType)!;
          
          if (typeMap.has(key)) {
            typeMap.get(key)!.count++;
          } else {
            typeMap.set(key, {
              lat: location.lat,
              lon: location.lon,
              count: 1
            });
          }
        }
      }

      // Convertir a formato de zonas de prestadores
      for (const [providerType, locationMap] of providerTypeCounts) {
        for (const [, data] of locationMap) {
          zoneData.push({
            lat: data.lat,
            lon: data.lon,
            providerType,
            count: data.count,
            zoneName: this.getZoneName(data.lat, data.lon)
          });
        }
      }

      const response: ProviderZonesResponse = {
        data: zoneData,
        totalProviders: providerEvents.length,
        providerTypes: Array.from(providerTypeCounts.keys()),
        period: {
          startDate: dateRanges.startDate.toISOString(),
          endDate: dateRanges.endDate.toISOString()
        }
      };

      res.status(200).json({
        success: true,
        data: response
      });

    } catch (error) {
      logger.error('Error getting prestadores zonas:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Extrae coordenadas de ubicación de un evento
   * @param event - Evento del que extraer la ubicación
   * @returns Coordenadas o null si no se encuentran
   */
  private extractLocationFromEvent(event: any): { lat: number; lon: number } | null {
    try {
      const cuerpo = event.cuerpo || {};
      
      // Buscar coordenadas en diferentes posibles ubicaciones del JSON
      let lat: number | undefined;
      let lon: number | undefined;

      // Caso 1: Coordenadas directas
      if (cuerpo.latitude && cuerpo.longitude) {
        lat = parseFloat(cuerpo.latitude);
        lon = parseFloat(cuerpo.longitude);
      }
      // Caso 2: Coordenadas en objeto location
      else if (cuerpo.location?.latitude && cuerpo.location?.longitude) {
        lat = parseFloat(cuerpo.location.latitude);
        lon = parseFloat(cuerpo.location.longitude);
      }
      // Caso 3: Coordenadas en objeto address
      else if (cuerpo.address?.latitude && cuerpo.address?.longitude) {
        lat = parseFloat(cuerpo.address.latitude);
        lon = parseFloat(cuerpo.address.longitude);
      }
      // Caso 4: Coordenadas en objeto coordinates
      else if (cuerpo.coordinates?.lat && cuerpo.coordinates?.lon) {
        lat = parseFloat(cuerpo.coordinates.lat);
        lon = parseFloat(cuerpo.coordinates.lon);
      }
      // Caso 5: Coordenadas en array [lat, lon]
      else if (Array.isArray(cuerpo.coordinates) && cuerpo.coordinates.length >= 2) {
        lat = parseFloat(cuerpo.coordinates[0]);
        lon = parseFloat(cuerpo.coordinates[1]);
      }

      // Validar que las coordenadas sean válidas
      if (lat !== undefined && lon !== undefined && 
          !isNaN(lat) && !isNaN(lon) &&
          lat >= -90 && lat <= 90 && 
          lon >= -180 && lon <= 180) {
        return { lat, lon };
      }

      return null;
    } catch (error) {
      logger.warn('Error extracting location from event:', error);
      return null;
    }
  }

  /**
   * Extrae el tipo de prestador de un evento
   * @param event - Evento del que extraer el tipo
   * @returns Tipo de prestador o null si no se encuentra
   */
  private extractProviderTypeFromEvent(event: any): string | null {
    try {
      const cuerpo = event.cuerpo || {};
      
      // Buscar tipo de prestador en diferentes posibles ubicaciones
      let providerType: string | undefined;

      if (cuerpo.providerType) {
        providerType = cuerpo.providerType;
      } else if (cuerpo.type) {
        providerType = cuerpo.type;
      } else if (cuerpo.category) {
        providerType = cuerpo.category;
      } else if (cuerpo.serviceType) {
        providerType = cuerpo.serviceType;
      }

      return providerType || 'unknown';
    } catch (error) {
      logger.warn('Error extracting provider type from event:', error);
      return 'unknown';
    }
  }

  /**
   * Obtiene el nombre de la zona basado en las coordenadas
   * @param lat - Latitud
   * @param lon - Longitud
   * @returns Nombre de la zona o undefined
   */
  private getZoneName(lat: number, lon: number): string | undefined {
    // Implementación básica de zonas geográficas
    // En un caso real, esto podría usar una API de geocodificación inversa
    
    // Buenos Aires y alrededores
    if (lat >= -35.0 && lat <= -34.0 && lon >= -59.0 && lon <= -58.0) {
      return 'Buenos Aires';
    }
    // Córdoba
    else if (lat >= -32.0 && lat <= -31.0 && lon >= -65.0 && lon <= -64.0) {
      return 'Córdoba';
    }
    // Rosario
    else if (lat >= -33.0 && lat <= -32.0 && lon >= -61.0 && lon <= -60.0) {
      return 'Rosario';
    }
    // Mendoza
    else if (lat >= -33.0 && lat <= -32.0 && lon >= -69.0 && lon <= -68.0) {
      return 'Mendoza';
    }
    // Tucumán
    else if (lat >= -27.0 && lat <= -26.0 && lon >= -66.0 && lon <= -65.0) {
      return 'Tucumán';
    }
    
    return undefined;
  }
}
