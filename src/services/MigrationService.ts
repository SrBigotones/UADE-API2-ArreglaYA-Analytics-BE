import { logger } from '../config/logger';
import { AppDataSource } from '../config/database';
import fs from 'fs';
import path from 'path';

export class MigrationService {
  constructor() {}

  /**
   * Ejecuta las migraciones de esquema al iniciar la aplicación
   */
  public async runMigrationsOnStartup(): Promise<void> {
    try {
      logger.info('🔄 Iniciando migraciones de base de datos...');

      // Crear tabla de control de migraciones si no existe
      await this.createMigrationTable();

      // Ejecutar migraciones SQL
      await this.runSQLMigrations();

      logger.info('✅ Migraciones de base de datos completadas');

    } catch (error) {
      logger.error('❌ Error en migraciones de base de datos:', error);
      throw new Error(`Database migrations failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Crea la tabla de control de migraciones
   */
  private async createMigrationTable(): Promise<void> {
    try {
      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS migration_history (
          id SERIAL PRIMARY KEY,
          version VARCHAR(50) NOT NULL UNIQUE,
          description VARCHAR(255),
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          success BOOLEAN DEFAULT TRUE
        );
      `);
    } catch (error) {
      logger.error('Error creando tabla de migraciones:', error);
      throw error;
    }
  }

  /**
   * Ejecuta migraciones SQL desde archivos
   */
  private async runSQLMigrations(): Promise<void> {
    const migrationDir = path.join(__dirname, '../main/resources/db/migration');
    
    if (!fs.existsSync(migrationDir)) {
      logger.warn('⚠️  Directorio de migraciones no encontrado');
      return;
    }

    const files = fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = file.split('__')[0];
      
      // Verificar si ya se ejecutó
      const existing = await AppDataSource.query(
        'SELECT * FROM migration_history WHERE version = $1',
        [version]
      );

      if (existing.length > 0) {
        continue; // Ya ejecutada
      }

      try {
        logger.info(`📄 Ejecutando migración: ${file}`);
        
        const filePath = path.join(migrationDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        await AppDataSource.query(sql);
        
        // Registrar migración ejecutada
        await AppDataSource.query(
          'INSERT INTO migration_history (version, description) VALUES ($1, $2)',
          [version, file]
        );

        logger.info(`✅ Migración ${version} ejecutada exitosamente`);
        
      } catch (error) {
        logger.error(`❌ Error en migración ${file}:`, error);
        throw error;
      }
    }
  }


  /**
   * Obtiene información sobre el estado de las migraciones
   */
  public async getMigrationInfo(): Promise<any> {
    try {
      // Obtener migraciones ejecutadas
      const migrations = await AppDataSource.query(
        'SELECT * FROM migration_history ORDER BY executed_at DESC'
      );

      return {
        migrations: migrations.length,
        lastMigration: migrations[0]?.version || 'None',
        lastExecutedAt: migrations[0]?.executed_at || null,
        status: 'connected'
      };
    } catch (error) {
      logger.error('Error obteniendo información de migraciones:', error);
      return {
        migrations: 0,
        lastMigration: 'Error',
        lastExecutedAt: null,
        status: 'error'
      };
    }
  }
}
