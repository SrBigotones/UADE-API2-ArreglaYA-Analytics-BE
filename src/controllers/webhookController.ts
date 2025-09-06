import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Event } from '../models/Event';
import { EventMessage } from '../types';
import { logger } from '../config/logger';
import { MetricsService } from '../services/MetricsService';

export class WebhookController {
  private metricsService: MetricsService;

  constructor() {
    this.metricsService = new MetricsService();
  }

  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { queue, event }: { queue: string; event: EventMessage } = req.body;

      logger.info(Received webhook for queue: , { event });

      // Save event to database
      const eventRepository = AppDataSource.getRepository(Event);
      const newEvent = eventRepository.create({
        squad: event.squad,
        topico: event.topico,
        evento: event.evento,
        cuerpo: event.cuerpo,
        timestamp: event.timestamp || new Date(),
        processed: false
      });

      await eventRepository.save(newEvent);

      // Process event for metrics calculation
      await this.metricsService.processEvent(newEvent);

      // Mark event as processed
      newEvent.processed = true;
      await eventRepository.save(newEvent);

      res.status(200).json({ 
        success: true, 
        message: 'Event processed successfully',
        eventId: newEvent.id
      });

    } catch (error) {
      logger.error('Error processing webhook:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error processing event',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, squad, topico, evento, processed } = req.query;
      
      const eventRepository = AppDataSource.getRepository(Event);
      const queryBuilder = eventRepository.createQueryBuilder('event');

      if (squad) queryBuilder.andWhere('event.squad = :squad', { squad });
      if (topico) queryBuilder.andWhere('event.topico = :topico', { topico });
      if (evento) queryBuilder.andWhere('event.evento = :evento', { evento });
      if (processed !== undefined) queryBuilder.andWhere('event.processed = :processed', { processed: processed === 'true' });

      const [events, total] = await queryBuilder
        .orderBy('event.timestamp', 'DESC')
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getManyAndCount();

      res.status(200).json({
        success: true,
        data: events,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      logger.error('Error fetching events:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching events',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
