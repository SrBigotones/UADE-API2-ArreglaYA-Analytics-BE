import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';
import webhookRoutes from './routes/webhooks';
import metricsRoutes from './routes/metrics';
import { errorHandler } from './middleware/errorHandler';
import { swaggerUi, specs } from './config/swagger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.urlFront,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Compression middleware
app.use(compression());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ArreglaYA Analytics API',
  swaggerOptions: {
    persistAuthorization: true,
  }
}));

// Routes
app.use('/api/webhooks', webhookRoutes);
app.use('/api/metrics', metricsRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'arregla-ya-metrics-backend'
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const startServer = async () => {
  try {
    logger.info('🚀 Starting ArreglaYA Analytics Backend...');
    logger.info('📋 Environment Configuration:');
    logger.info(`NODE_ENV: ${config.nodeEnv}`);
    logger.info(`PORT: ${config.port}`);
    logger.info(`URL_FRONT: ${config.urlFront}`);
    logger.info(`CORE_HUB_URL: ${config.coreHubUrl}`);
    
    logger.info('🔧 Database Environment Variables:');
    logger.info(`DB_HOST: ${process.env.DB_HOST || 'undefined (using default: localhost)'}`);
    logger.info(`DB_PORT: ${process.env.DB_PORT || 'undefined (using default: 5432)'}`);
    logger.info(`DB_USERNAME: ${process.env.DB_USERNAME || 'undefined (using default: postgres)'}`);
    logger.info(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***SET***' : 'undefined (using default: empty)'}`);
    logger.info(`DB_NAME: ${process.env.DB_NAME || 'undefined (using default: arregla_ya_metrics)'}`);
    
    await connectDatabase();
    
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
      logger.info(`API Documentation: http://localhost:${config.port}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
