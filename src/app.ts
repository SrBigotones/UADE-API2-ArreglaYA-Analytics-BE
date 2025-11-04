import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// importa tus rutas, middlewares, swagger, etc.
import webhookRoutes from './routes/webhooks';
import metricsRoutes from './routes/metrics';
import authRoutes from './routes/auth';
import testDataRoutes from './routes/testData';
import featureFlagRoutes from './routes/featureFlags';
import { errorHandler } from './middleware/errorHandler';
import { swaggerUi, specs } from './config/swagger';
import { HealthController } from './controllers/HealthController';

const app = express();
const healthController = new HealthController();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan('combined'));

// Health endpoints
app.get('/health', healthController.healthCheck.bind(healthController));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/metrica', metricsRoutes);
app.use('/api/test-data', testDataRoutes);

// Rutas internas (ocultas, no aparecen en Swagger)
app.use('/api/internal/feature-flags', featureFlagRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// siempre al final
app.use(errorHandler);

export default app;
