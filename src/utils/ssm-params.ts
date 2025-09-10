import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

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
    const prefix = process.env.SSM_PATH_PREFIX;
    
    const getParam = async (name: string) => {
        const command = new GetParameterCommand({
            Name: `${prefix}/${name}`,
            WithDecryption: true
        });
        const response = await ssmClient.send(command);
        return response.Parameter?.Value || '';
    };

    const [host, port, username, password, database] = await Promise.all([
        getParam('host'),
        getParam('port'),
        getParam('username'),
        getParam('password'),
        getParam('name')
    ]);

    return {
        type: 'postgres',
        host,
        port: parseInt(port, 10),
        username,
        password,
        database,
        synchronize: false,  // Por seguridad en producción
        logging: true,
        ssl: { rejectUnauthorized: false }  // Ajusta según tu configuración
    };
}
