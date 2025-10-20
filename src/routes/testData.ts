import { Router } from 'express';
import { TestDataController } from '../controllers/TestDataController';
import { nonProductionOnly } from '../middleware/nonProduction';

const router = Router();
const testDataController = new TestDataController();

// Apply non-production middleware to all routes in this router
router.use(nonProductionOnly);

/**
 * @swagger
 * /api/test-data/events:
 *   post:
 *     summary: Bulk create test events
 *     description: Create multiple test events at once. Only available in non-production environments.
 *     tags: [Test Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - events
 *             properties:
 *               events:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - squad
 *                     - topico
 *                     - evento
 *                     - cuerpo
 *                   properties:
 *                     squad:
 *                       type: string
 *                       example: "Test Squad"
 *                     topico:
 *                       type: string
 *                       example: "Test Topic"
 *                     evento:
 *                       type: string
 *                       example: "Test Event"
 *                     cuerpo:
 *                       type: object
 *                       example: { "testData": "value" }
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     processed:
 *                       type: boolean
 *                       default: false
 *                     messageId:
 *                       type: string
 *                     correlationId:
 *                       type: string
 *           example:
 *             events:
 *               - squad: "Test Squad"
 *                 topico: "Test Topic"
 *                 evento: "Usuario Creado"
 *                 cuerpo:
 *                   userId: "test-123"
 *                   email: "test@example.com"
 *               - squad: "Test Squad"
 *                 topico: "Test Topic"
 *                 evento: "Usuario Actualizado"
 *                 cuerpo:
 *                   userId: "test-123"
 *                   name: "Test User"
 *     responses:
 *       201:
 *         description: Test events created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Successfully created 2 test events"
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 2
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid request body
 *       403:
 *         description: Endpoint not available in production
 *       500:
 *         description: Server error
 */
router.post('/events', testDataController.bulkCreateEvents.bind(testDataController));

/**
 * @swagger
 * /api/test-data/events/{id}:
 *   delete:
 *     summary: Delete a test event by ID
 *     description: Delete a single test event. Only available in non-production environments.
 *     tags: [Test Data]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Event ID to delete
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Successfully deleted event 123e4567-e89b-12d3-a456-426614174000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedEvent:
 *                       type: object
 *       403:
 *         description: Endpoint not available in production or trying to delete non-test data
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.delete('/events/:id', testDataController.deleteEventById.bind(testDataController));

/**
 * @swagger
 * /api/test-data/events:
 *   delete:
 *     summary: Clean all test data
 *     description: Delete all events marked as test data (source='test-data'). Only available in non-production environments.
 *     tags: [Test Data]
 *     responses:
 *       200:
 *         description: Test data cleaned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Successfully deleted 15 test events"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: integer
 *                       example: 15
 *       403:
 *         description: Endpoint not available in production
 *       500:
 *         description: Server error
 */
router.delete('/events', testDataController.cleanAllTestData.bind(testDataController));

/**
 * @swagger
 * /api/test-data/events/by-source:
 *   get:
 *     summary: Get events by source
 *     description: Retrieve all events filtered by their source field. Only available in non-production environments.
 *     tags: [Test Data]
 *     parameters:
 *       - in: query
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *           enum: [test-data, core-hub, direct-webhook, unknown]
 *         description: Source of the events to retrieve
 *         example: "test-data"
 *       - in: query
 *         name: squad
 *         schema:
 *           type: string
 *         description: Filter by squad
 *       - in: query
 *         name: topico
 *         schema:
 *           type: string
 *         description: Filter by topic
 *       - in: query
 *         name: evento
 *         schema:
 *           type: string
 *         description: Filter by event type
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 filter:
 *                   type: object
 *                   properties:
 *                     source:
 *                       type: string
 *                     squad:
 *                       type: string
 *                       nullable: true
 *                     topico:
 *                       type: string
 *                       nullable: true
 *                     evento:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Source parameter is required
 *       403:
 *         description: Endpoint not available in production
 *       500:
 *         description: Server error
 */
router.get('/events/by-source', testDataController.getEventsBySource.bind(testDataController));

/**
 * @swagger
 * /api/test-data/events/count:
 *   get:
 *     summary: Get count of test data
 *     description: Returns the count of events marked as test data. Only available in non-production environments.
 *     tags: [Test Data]
 *     responses:
 *       200:
 *         description: Test data count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     testDataCount:
 *                       type: integer
 *                       example: 42
 *       403:
 *         description: Endpoint not available in production
 *       500:
 *         description: Server error
 */
router.get('/events/count', testDataController.getTestDataCount.bind(testDataController));

export default router;

