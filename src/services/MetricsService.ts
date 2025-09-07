import { AppDataSource } from '../config/database';
import { Event } from '../models/Event';
import { Metric } from '../models/Metric';
import { logger } from '../config/logger';
import { UserMetrics, ServiceMetrics, RequestMetrics, PaymentMetrics, ProviderMetrics } from '../types';

export class MetricsService {
  private eventRepository = AppDataSource.getRepository(Event);
  private metricRepository = AppDataSource.getRepository(Metric);

  public async processEvent(event: Event): Promise<void> {
    try {
      logger.info(`Processing event: ${event.squad} - ${event.topico} - ${event.evento}`);

      // Process different types of events
      switch (event.squad) {
        case 'Usuarios y Roles':
          await this.processUserEvent(event);
          break;
        case 'Cat�logo de servicios y Prestadores':
          await this.processServiceEvent(event);
          break;
        case 'App de b�squeda y solicitudes':
          await this.processRequestEvent(event);
          break;
        case 'Pagos y Facturaci�n':
          await this.processPaymentEvent(event);
          break;
        case 'Matching y Agenda':
          await this.processMatchingEvent(event);
          break;
        default:
          logger.warn(`Unknown squad: ${event.squad}`);
      }

      // Calculate general KPIs
      await this.calculateGeneralKPIs();

    } catch (error) {
      logger.error('Error processing event:', error);
      throw error;
    }
  }

  private async processUserEvent(event: Event): Promise<void> {
    const { evento, cuerpo } = event;

    switch (evento) {
      case 'Usuario Creado':
        await this.saveMetric('total_users', 1, 'count', 'incremental');
        await this.saveMetric('new_users_today', 1, 'count', 'daily');
        break;
      case 'Usuario Actualizado':
        // Update user metrics if needed
        break;
      case 'Usuario Inactivo':
        await this.saveMetric('inactive_users', 1, 'count', 'incremental');
        break;
    }
  }

  private async processServiceEvent(event: Event): Promise<void> {
    const { evento, cuerpo } = event;

    switch (evento) {
      case 'Servicio Creado':
        await this.saveMetric('total_services', 1, 'count', 'incremental');
        break;
      case 'Servicio Actualizado':
        // Update service metrics if needed
        break;
    }
  }

  private async processRequestEvent(event: Event): Promise<void> {
    const { evento, cuerpo } = event;

    switch (evento) {
      case 'Solicitud Creada':
        await this.saveMetric('total_requests', 1, 'count', 'incremental');
        await this.saveMetric('pending_requests', 1, 'count', 'incremental');
        break;
      case 'Solicitud Actualizada':
        // Update request metrics
        break;
      case 'Solicitud Cancelada':
        await this.saveMetric('cancelled_requests', 1, 'count', 'incremental');
        await this.saveMetric('pending_requests', -1, 'count', 'incremental');
        break;
    }
  }

  private async processPaymentEvent(event: Event): Promise<void> {
    const { evento, cuerpo } = event;

    switch (evento) {
      case 'Pago Aprobado':
        await this.saveMetric('successful_payments', 1, 'count', 'incremental');
        await this.saveMetric('total_revenue', cuerpo.amount || 0, 'currency', 'incremental');
        break;
      case 'Pago Rechazado':
        await this.saveMetric('failed_payments', 1, 'count', 'incremental');
        break;
    }
  }

  private async processMatchingEvent(event: Event): Promise<void> {
    const { evento, cuerpo } = event;

    switch (evento) {
      case 'Cotizaci�n Emitida':
        await this.saveMetric('total_quotations', 1, 'count', 'incremental');
        break;
      case 'Cotizaci�n Aceptada':
        await this.saveMetric('accepted_quotations', 1, 'count', 'incremental');
        break;
      case 'Cotizaci�n Rechazada':
        await this.saveMetric('rejected_quotations', 1, 'count', 'incremental');
        break;
    }
  }

  private async saveMetric(name: string, value: number, unit: string, period: string): Promise<void> {
    const metric = this.metricRepository.create({
      name,
      value,
      unit,
      period,
      timestamp: new Date()
    });

    await this.metricRepository.save(metric);
  }

  private async calculateGeneralKPIs(): Promise<void> {
    // This method can be called periodically to calculate complex KPIs
    // For now, we'll implement basic calculations
  }

  public async getUserMetrics(): Promise<UserMetrics> {
    const totalUsers = await this.metricRepository
      .createQueryBuilder('metric')
      .select('SUM(metric.value)', 'total')
      .where('metric.name = :name', { name: 'total_users' })
      .getRawOne();

    const newUsersToday = await this.metricRepository
      .createQueryBuilder('metric')
      .select('SUM(metric.value)', 'total')
      .where('metric.name = :name', { name: 'new_users_today' })
      .andWhere('DATE(metric.timestamp) = CURDATE()')
      .getRawOne();

    return {
      totalUsers: Number(totalUsers?.total) || 0,
      activeUsers: 0, // This would need more complex logic
      newUsersToday: Number(newUsersToday?.total) || 0,
      newUsersThisWeek: 0, // This would need more complex logic
      newUsersThisMonth: 0 // This would need more complex logic
    };
  }

  public async getServiceMetrics(): Promise<ServiceMetrics> {
    const totalServices = await this.metricRepository
      .createQueryBuilder('metric')
      .select('SUM(metric.value)', 'total')
      .where('metric.name = :name', { name: 'total_services' })
      .getRawOne();

    return {
      totalServices: Number(totalServices?.total) || 0,
      activeServices: 0, // This would need more complex logic
      servicesByCategory: {}, // This would need more complex logic
      averageRating: 0 // This would need more complex logic
    };
  }

  public async getRequestMetrics(): Promise<RequestMetrics> {
    const totalRequests = await this.metricRepository
      .createQueryBuilder('metric')
      .select('SUM(metric.value)', 'total')
      .where('metric.name = :name', { name: 'total_requests' })
      .getRawOne();

    const pendingRequests = await this.metricRepository
      .createQueryBuilder('metric')
      .select('SUM(metric.value)', 'total')
      .where('metric.name = :name', { name: 'pending_requests' })
      .getRawOne();

    return {
      totalRequests: Number(totalRequests?.total) || 0,
      pendingRequests: Number(pendingRequests?.total) || 0,
      completedRequests: 0, // This would need more complex logic
      cancelledRequests: 0, // This would need more complex logic
      averageResponseTime: 0 // This would need more complex logic
    };
  }

  public async getPaymentMetrics(): Promise<PaymentMetrics> {
    const successfulPayments = await this.metricRepository
      .createQueryBuilder('metric')
      .select('SUM(metric.value)', 'total')
      .where('metric.name = :name', { name: 'successful_payments' })
      .getRawOne();

    const totalRevenue = await this.metricRepository
      .createQueryBuilder('metric')
      .select('SUM(metric.value)', 'total')
      .where('metric.name = :name', { name: 'total_revenue' })
      .getRawOne();

    return {
      totalPayments: Number(successfulPayments?.total) || 0,
      successfulPayments: Number(successfulPayments?.total) || 0,
      failedPayments: 0, // This would need more complex logic
      totalRevenue: Number(totalRevenue?.total) || 0,
      averagePaymentAmount: 0 // This would need more complex logic
    };
  }

  public async getProviderMetrics(): Promise<ProviderMetrics> {
    // This would need more complex logic to calculate provider metrics
    return {
      totalProviders: 0,
      activeProviders: 0,
      averageProviderRating: 0,
      topRatedProviders: []
    };
  }
}
