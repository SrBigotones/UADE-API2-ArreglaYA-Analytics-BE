import dotenv from 'dotenv';
import path from 'path';

// Load .env file explicitly with path resolution
const envResult = dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (envResult.error) {
  console.warn('⚠️ Warning: Could not load .env file:', envResult.error.message);
} else {
  console.log('✅ .env file loaded successfully');
}

// Log environment variables for debugging (especially in Lambda cold starts)
console.log('🔍 Loading configuration...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CORE_HUB_URL from env:', process.env.CORE_HUB_URL);
console.log('CORE_HUB_API_KEY exists:', !!process.env.CORE_HUB_API_KEY);
console.log('USERS_API_BASE_URL from env:', process.env.USERS_API_BASE_URL || 'NOT SET (will use default: http://localhost:8080)');

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

// Log the final configuration value
console.log('📋 Final config.usersApiBaseUrl:', config.usersApiBaseUrl);

export default config;
export { config };

// Flag to track if Core Hub config has been loaded from SSM
let coreHubConfigLoaded = false;

// Function to load all runtime config from SSM (for Lambda)
export async function loadCoreHubConfig(): Promise<void> {
  if (coreHubConfigLoaded) {
    console.log('✅ Runtime config already loaded from SSM');
    return;
  }

  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (!isLambda) {
    console.log('ℹ️ Not running in Lambda, skipping SSM runtime config load');
    return;
  }

  try {
    console.log('🔄 Loading runtime configuration from SSM...');
    const { getCoreHubConfig, getAppConfig } = await import('../utils/ssm-params');
    
    // Load Core Hub config
    const coreHubConfig = await getCoreHubConfig();
    config.coreHub.url = coreHubConfig.url;
    config.coreHub.apiKey = coreHubConfig.apiKey;
    
    console.log('✅ Core Hub config loaded from SSM:', {
      url: coreHubConfig.url,
      hasApiKey: !!coreHubConfig.apiKey
    });
    
    // Load App config (Users API, webhook, etc.)
    const appConfig = await getAppConfig();
    config.usersApiBaseUrl = appConfig.usersApiBaseUrl;
    config.webhookSecret = appConfig.webhookSecret;
    
    console.log('✅ App config loaded from SSM:', {
      usersApiBaseUrl: appConfig.usersApiBaseUrl,
      webhookBaseUrl: appConfig.webhookBaseUrl,
      hasWebhookSecret: !!appConfig.webhookSecret
    });
    
    coreHubConfigLoaded = true;
  } catch (error) {
    console.error('❌ Failed to load runtime config from SSM:', error);
    console.log('⚠️ Using environment variables or defaults');
  }
}
