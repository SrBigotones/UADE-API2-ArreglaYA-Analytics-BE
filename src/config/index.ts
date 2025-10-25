import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'local',
  database: {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'arregla_ya_metrics',
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  coreHub: {
    url: process.env.CORE_HUB_URL || 'http://localhost:8080',
    apiKey: process.env.CORE_HUB_API_KEY || '',
    timeout: parseInt(process.env.CORE_HUB_TIMEOUT || '5000'), // 5 segundos por defecto
    retryAttempts: parseInt(process.env.CORE_HUB_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.CORE_HUB_RETRY_DELAY || '500'), // 500ms entre reintentos
    keepAliveTimeout: parseInt(process.env.CORE_HUB_KEEP_ALIVE_TIMEOUT || '30000'), // 30 segundos
  },
  webhookSecret: process.env.WEBHOOK_SECRET || 'your-webhook-secret',
  enableWebhookSignatureValidation: process.env.ENABLE_WEBHOOK_SIGNATURE_VALIDATION === 'true',
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  // Authentication is delegated to the Users service
  // We don't verify JWTs locally - tokens are forwarded to Users service for verification
  usersApiBaseUrl: process.env.USERS_API_BASE_URL || 'http://localhost:8080',
};

export default config;
export { config };
