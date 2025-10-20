import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Event } from '../models/Event';
import { logger } from '../config/logger';
import { randomUUID } from 'crypto';

/**
 * Controller for managing test data in non-production environments
 * All test data is marked with source: 'test-data' for easy identification
 */
export class TestDataController {
  private readonly TEST_DATA_SOURCE = 'test-data';

  /**
   * Bulk create test events
   * POST /api/test-data/events
   */
  public async bulkCreateEvents(req: Request, res: Response): Promise<void> {
    try {
      const events = req.body.events;

      if (!Array.isArray(events)) {
        res.status(400).json({
          success: false,
          message: 'Body must contain an "events" array'
        });
        return;
      }

      if (events.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Events array cannot be empty'
        });
        return;
      }

      // Validate each event has required fields
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (!event.squad || !event.topico || !event.evento || !event.cuerpo) {
          res.status(400).json({
            success: false,
            message: `Event at index ${i} is missing required fields (squad, topico, evento, cuerpo)`
          });
          return;
        }
      }

      const eventRepository = AppDataSource.getRepository(Event);
      
      // Create events with test-data source marker
      const testEvents = events.map(event => 
        eventRepository.create({
          squad: event.squad,
          topico: event.topico,
          evento: event.evento,
          cuerpo: event.cuerpo,
          timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
          processed: event.processed ?? false,
          messageId: event.messageId || `test-${randomUUID()}`,
          correlationId: event.correlationId,
          source: this.TEST_DATA_SOURCE // Mark as test data
        })
      );

      const savedEvents = await eventRepository.save(testEvents);

      logger.info(`Created ${savedEvents.length} test events`);

      res.status(201).json({
        success: true,
        message: `Successfully created ${savedEvents.length} test events`,
        data: {
          count: savedEvents.length,
          events: savedEvents
        }
      });

    } catch (error) {
      logger.error('Error bulk creating test events:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating test events',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a single event by ID
   * DELETE /api/test-data/events/:id
   */
  public async deleteEventById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Event ID is required'
        });
        return;
      }

      const eventRepository = AppDataSource.getRepository(Event);
      const event = await eventRepository.findOne({ where: { id } });

      if (!event) {
        res.status(404).json({
          success: false,
          message: `Event with ID ${id} not found`
        });
        return;
      }

      // Only allow deletion of test data
      if (event.source !== this.TEST_DATA_SOURCE) {
        logger.warn(`Attempt to delete non-test event ${id} via test-data endpoint`);
        res.status(403).json({
          success: false,
          message: 'This endpoint can only delete test data (source="test-data"). Cannot delete production events.'
        });
        return;
      }

      await eventRepository.remove(event);

      logger.info(`Deleted test event with ID: ${id}`);

      res.status(200).json({
        success: true,
        message: `Successfully deleted event ${id}`,
        data: {
          deletedEvent: {
            id: event.id,
            squad: event.squad,
            topico: event.topico,
            evento: event.evento
          }
        }
      });

    } catch (error) {
      logger.error('Error deleting test event:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting test event',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete all test data
   * DELETE /api/test-data/events
   */
  public async cleanAllTestData(req: Request, res: Response): Promise<void> {
    try {
      const eventRepository = AppDataSource.getRepository(Event);

      // Find all test data
      const testEvents = await eventRepository.find({
        where: { source: this.TEST_DATA_SOURCE }
      });

      if (testEvents.length === 0) {
        res.status(200).json({
          success: true,
          message: 'No test data found to delete',
          data: {
            deletedCount: 0
          }
        });
        return;
      }

      // Delete all test data
      await eventRepository.remove(testEvents);

      logger.info(`Deleted ${testEvents.length} test events`);

      res.status(200).json({
        success: true,
        message: `Successfully deleted ${testEvents.length} test events`,
        data: {
          deletedCount: testEvents.length
        }
      });

    } catch (error) {
      logger.error('Error cleaning test data:', error);
      res.status(500).json({
        success: false,
        message: 'Error cleaning test data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get count of test data
   * GET /api/test-data/events/count
   */
  public async getTestDataCount(req: Request, res: Response): Promise<void> {
    try {
      const eventRepository = AppDataSource.getRepository(Event);

      const count = await eventRepository.count({
        where: { source: this.TEST_DATA_SOURCE }
      });

      res.status(200).json({
        success: true,
        data: {
          testDataCount: count
        }
      });

    } catch (error) {
      logger.error('Error getting test data count:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting test data count',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get events by source
   * GET /api/test-data/events/by-source
   */
  public async getEventsBySource(req: Request, res: Response): Promise<void> {
    try {
      const { 
        source,
        squad,
        topico,
        evento
      } = req.query;

      if (!source) {
        res.status(400).json({
          success: false,
          message: 'Source query parameter is required'
        });
        return;
      }

      const eventRepository = AppDataSource.getRepository(Event);
      const queryBuilder = eventRepository.createQueryBuilder('event');

      // Filter by source
      queryBuilder.where('event.source = :source', { source });

      // Additional optional filters
      if (squad) queryBuilder.andWhere('event.squad = :squad', { squad });
      if (topico) queryBuilder.andWhere('event.topico = :topico', { topico });
      if (evento) queryBuilder.andWhere('event.evento = :evento', { evento });

      const events = await queryBuilder
        .orderBy('event.timestamp', 'DESC')
        .getMany();

      res.status(200).json({
        success: true,
        data: events,
        count: events.length,
        filter: {
          source,
          squad: squad || null,
          topico: topico || null,
          evento: evento || null
        }
      });

    } catch (error) {
      logger.error('Error getting events by source:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting events by source',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

