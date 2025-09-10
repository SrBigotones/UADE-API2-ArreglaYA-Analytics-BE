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
}

export async function getDBConfig(): Promise<DBConfig> {
    // Use the exact path as configured in AWS Parameter Store
    const prefix = '/arreglaya/analytics/prod/db';
    
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
            synchronize: false,  // Por seguridad en producción
            logging: true,
            ssl: { rejectUnauthorized: false }
        };
    } catch (error: any) {
        logger.error('Failed to retrieve database configuration from SSM:', error);
        throw new Error('Could not load database configuration from SSM: ' + (error.message || 'Unknown error'));
    }
}
