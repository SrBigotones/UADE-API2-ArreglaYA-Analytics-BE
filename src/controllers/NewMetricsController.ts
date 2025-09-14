import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { DateRangeService } from '../services/DateRangeService';
import { BaseMetricsCalculator } from '../services/BaseMetricsCalculator';
import { CardMetricResponse, PieMetricResponse, PeriodType, DateRangeFilter } from '../types';

export class NewMetricsController extends BaseMetricsCalculator {
  
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
}
