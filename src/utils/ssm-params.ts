import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { logger } from '../config/logger';

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
    const prefix = process.env.SSM_PATH_PREFIX || '/arregla-ya/analytics';
    
    const getParam = async (name: string) => {
        try {
            const command = new GetParameterCommand({
                Name: `${prefix}/${name}`,
                WithDecryption: true
            });
            const response = await ssmClient.send(command);
            if (!response.Parameter?.Value) {
                throw new Error(`Parameter ${name} not found`);
            }
            return response.Parameter.Value;
        } catch (error) {
            logger.error(`Error fetching SSM parameter ${name}:`, error);
            throw error;
        }
    };

    try {
        logger.info('Fetching database configuration from SSM...');
        
        const [host, port, username, password, database] = await Promise.all([
            getParam('db/host'),
            getParam('db/port'),
            getParam('db/username'),
            getParam('db/password'),
            getParam('db/name')
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
