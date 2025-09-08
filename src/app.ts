import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// importa tus rutas, middlewares, swagger, etc.
import webhookRoutes from './routes/webhooks';
import metricsRoutes from './routes/metrics';
import { errorHandler } from './middleware/errorHandler';
import { swaggerUi, specs } from './config/swagger';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan('combined'));

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api/webhooks', webhookRoutes);
app.use('/api/metrics', metricsRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// siempre al final
app.use(errorHandler);

export default app;
