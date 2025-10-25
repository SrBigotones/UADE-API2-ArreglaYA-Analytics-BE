import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { logger } from '../config/logger';

// Log environment variables for debugging
logger.info('SSM Environment configuration:', {
    AWS_REGION: process.env.AWS_REGION,
    NODE_ENV: process.env.NODE_ENV,
    SSM_PATH_PREFIX: process.env.SSM_PATH_PREFIX,
    AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME
});

const ssmClient = new SSMClient({ 
    region: process.env.AWS_REGION || 'us-east-1'
});

export interface DBConfig {
    type: 'postgres';
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean;
    logging: boolean;
    ssl: boolean | { rejectUnauthorized: boolean; };
    migrationsRun?: boolean;
}

export async function getDBConfig(): Promise<DBConfig> {
    // Use environment-specific path
    const stage = process.env.STAGE || 'prod';
    const prefix = `/arreglaya/analytics/${stage}/db`;
    
    logger.info(`Using stage: ${stage} for SSM parameters`);
    
    const getParam = async (name: string) => {
        const fullPath = `${prefix}/${name}`;
        try {
            logger.info(`Fetching SSM parameter: ${fullPath}`);
            
            const command = new GetParameterCommand({
                Name: fullPath,
                WithDecryption: true
            });
            
            const response = await ssmClient.send(command);
            
            if (!response.Parameter?.Value) {
                throw new Error(`Parameter ${fullPath} found but has no value`);
            }
            
            logger.info(`Successfully retrieved parameter: ${fullPath}`);
            return response.Parameter.Value;
        } catch (error: any) {
            if (error.$metadata?.httpStatusCode === 400 && error.__type === 'ParameterNotFound') {
                logger.error(`SSM Parameter not found: ${fullPath}`);
            } else {
                logger.error(`Error fetching SSM parameter ${fullPath}:`, {
                    errorType: error.__type,
                    errorMessage: error.message,
                    httpStatusCode: error.$metadata?.httpStatusCode
                });
            }
            throw error;
        }
    };

    try {
        logger.info('Fetching database configuration from SSM...');
        
        // Log the SSM path prefix for debugging
    logger.info(`Using SSM path prefix: ${prefix}`);
    
    // Create full parameter paths
    const paramNames = {
        host: 'host',
        port: 'port',
        username: 'username',
        password: 'password',
        database: 'name'
    };

    // Log each parameter path we're going to request
    Object.entries(paramNames).forEach(([key, value]) => {
        logger.info(`Will request SSM parameter: ${prefix}/${value}`);
    });

    const [host, port, username, password, database] = await Promise.all([
        getParam(paramNames.host),
        getParam(paramNames.port),
        getParam(paramNames.username),
        getParam(paramNames.password),
        getParam(paramNames.database)
    ]);

        logger.info(`Successfully retrieved database configuration. Host: ${host}`);

        return {
            type: 'postgres',
            host,
            port: parseInt(port, 10),
            username,
            password,
            database,
            synchronize: true, // Habilitado para permitir la creación inicial de tablas
            logging: true,
            ssl: { rejectUnauthorized: false },
            migrationsRun: true // Habilitado para ejecutar migraciones pendientes
        };
    } catch (error: any) {
        logger.error('Failed to retrieve database configuration from SSM:', error);
        throw new Error('Could not load database configuration from SSM: ' + (error.message || 'Unknown error'));
    }
}

export async function getCoreHubConfig(): Promise<{ url: string; apiKey: string }> {
    const stage = process.env.STAGE || 'prod';
    // Todos los parámetros están bajo /db/ path
    const prefix = `/arreglaya/analytics/${stage}/db`;
    
    logger.info(`Fetching Core Hub configuration from SSM with stage: ${stage}`);
    
    const getParam = async (name: string, required: boolean = true) => {
        const fullPath = `${prefix}/${name}`;
        try {
            logger.info(`Fetching SSM parameter: ${fullPath}`);
            
            const command = new GetParameterCommand({
                Name: fullPath,
                WithDecryption: true
            });
            
            const response = await ssmClient.send(command);
            
            if (!response.Parameter?.Value) {
                logger.warn(`Parameter ${fullPath} found but has no value, using default`);
                return '';
            }
            
            logger.info(`Successfully retrieved parameter: ${fullPath}`);
            return response.Parameter.Value;
        } catch (error: any) {
            if (error.$metadata?.httpStatusCode === 400 && error.__type === 'ParameterNotFound') {
                logger.warn(`SSM Parameter not found: ${fullPath}, will use environment variable or default`);
            } else {
                logger.error(`Error fetching SSM parameter ${fullPath}:`, {
                    errorType: error.__type,
                    errorMessage: error.message,
                    httpStatusCode: error.$metadata?.httpStatusCode
                });
            }
            if (required) {
                throw error;
            }
            return '';
        }
    };

    try {
        const [url, apiKey] = await Promise.all([
            getParam('core-hub-url'),
            getParam('core-hub-api-key')
        ]);

        logger.info(`Successfully retrieved Core Hub configuration. URL: ${url}`);

        return {
            url: url || process.env.CORE_HUB_URL || 'http://localhost:8080',
            apiKey: apiKey || process.env.CORE_HUB_API_KEY || ''
        };
    } catch (error: any) {
        logger.warn('Could not load Core Hub config from SSM, falling back to environment variables:', error.message);
        return {
            url: process.env.CORE_HUB_URL || 'http://localhost:8080',
            apiKey: process.env.CORE_HUB_API_KEY || ''
        };
    }
}

export async function getAppConfig(): Promise<{ usersApiBaseUrl: string; webhookSecret: string; webhookBaseUrl: string }> {
    const stage = process.env.STAGE || 'prod';
    // Todos los parámetros están bajo /db/ path
    const prefix = `/arreglaya/analytics/${stage}/db`;
    
    logger.info(`Fetching App configuration from SSM with stage: ${stage}`);
    
    const getParam = async (name: string) => {
        const fullPath = `${prefix}/${name}`;
        try {
            logger.info(`Fetching SSM parameter: ${fullPath}`);
            
            const command = new GetParameterCommand({
                Name: fullPath,
                WithDecryption: true
            });
            
            const response = await ssmClient.send(command);
            
            if (!response.Parameter?.Value) {
                logger.warn(`Parameter ${fullPath} found but has no value, using default`);
                return '';
            }
            
            logger.info(`Successfully retrieved parameter: ${fullPath}`);
            return response.Parameter.Value;
        } catch (error: any) {
            if (error.$metadata?.httpStatusCode === 400 && error.__type === 'ParameterNotFound') {
                logger.warn(`SSM Parameter not found: ${fullPath}, will use environment variable or default`);
            } else {
                logger.error(`Error fetching SSM parameter ${fullPath}:`, {
                    errorType: error.__type,
                    errorMessage: error.message,
                    httpStatusCode: error.$metadata?.httpStatusCode
                });
            }
            throw error;
        }
    };

    try {
        const [usersApiBaseUrl, webhookSecret, webhookBaseUrl] = await Promise.all([
            getParam('users-api-base-url'),
            getParam('webhook-secret'),
            getParam('webhook-base-url')
        ]);

        logger.info(`Successfully retrieved App configuration.`, {
            usersApiBaseUrl,
            webhookBaseUrl,
            hasWebhookSecret: !!webhookSecret
        });

        return {
            usersApiBaseUrl: usersApiBaseUrl || process.env.USERS_API_BASE_URL || 'http://localhost:8080',
            webhookSecret: webhookSecret || process.env.WEBHOOK_SECRET || '',
            webhookBaseUrl: webhookBaseUrl || process.env.WEBHOOK_BASE_URL || ''
        };
    } catch (error: any) {
        logger.warn('Could not load App config from SSM, falling back to environment variables:', error.message);
        return {
            usersApiBaseUrl: process.env.USERS_API_BASE_URL || 'http://localhost:8080',
            webhookSecret: process.env.WEBHOOK_SECRET || '',
            webhookBaseUrl: process.env.WEBHOOK_BASE_URL || ''
        };
    }
}
