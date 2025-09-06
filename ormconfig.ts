import { DataSource } from 'typeorm';
import { config } from './src/config';

export default new DataSource({
  type: 'mysql',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: config.database.synchronize,
  logging: config.database.logging,
  entities: [__dirname + '/src/models/*.ts'],
  migrations: [__dirname + '/src/migrations/*.ts'],
  subscribers: [__dirname + '/src/subscribers/*.ts'],
});
