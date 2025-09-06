import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Metric } from '../models/Metric';
import { logger } from '../config/logger';
import { MetricsService } from '../services/MetricsService';

export class MetricsController {
  private metricsService: MetricsService;
  private metricRepository = AppDataSource.getRepository(Metric);

  constructor() {
    this.metricsService = new MetricsService();
  }

  public async getAllMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, name, period, startDate, endDate } = req.query;
      
      const queryBuilder = this.metricRepository.createQueryBuilder('metric');

      if (name) queryBuilder.andWhere('metric.name = :name', { name });
      if (period) queryBuilder.andWhere('metric.period = :period', { period });
      if (startDate) queryBuilder.andWhere('metric.timestamp >= :startDate', { startDate });
      if (endDate) queryBuilder.andWhere('metric.timestamp <= :endDate', { endDate });

      const [metrics, total] = await queryBuilder
        .orderBy('metric.timestamp', 'DESC')
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getManyAndCount();

      res.status(200).json({
        success: true,
        data: metrics,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      logger.error('Error fetching metrics:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getMetricByName(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { period, startDate, endDate } = req.query;

      const queryBuilder = this.metricRepository.createQueryBuilder('metric')
        .where('metric.name = :name', { name });

      if (period) queryBuilder.andWhere('metric.period = :period', { period });
      if (startDate) queryBuilder.andWhere('metric.timestamp >= :startDate', { startDate });
      if (endDate) queryBuilder.andWhere('metric.timestamp <= :endDate', { endDate });

      const metrics = await queryBuilder
        .orderBy('metric.timestamp', 'DESC')
        .getMany();

      res.status(200).json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Error fetching metric by name:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching metric',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getUserMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.metricsService.getUserMetrics();
      
      res.status(200).json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Error fetching user metrics:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching user metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getServiceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.metricsService.getServiceMetrics();
      
      res.status(200).json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Error fetching service metrics:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching service metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getRequestMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.metricsService.getRequestMetrics();
      
      res.status(200).json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Error fetching request metrics:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching request metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getPaymentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.metricsService.getPaymentMetrics();
      
      res.status(200).json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Error fetching payment metrics:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching payment metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getProviderMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.metricsService.getProviderMetrics();
      
      res.status(200).json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Error fetching provider metrics:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching provider metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
