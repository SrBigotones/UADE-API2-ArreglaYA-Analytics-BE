import { logger } from '../config/logger';
import { config } from '../config';
import { AppDataSource } from '../config/database';
import fs from 'fs';
import path from 'path';

export class MigrationService {
  constructor() {}

  /**
   * Ejecuta las migraciones automáticamente al iniciar la aplicación
   */
  public async runMigrationsOnStartup(): Promise<void> {
    try {
      logger.info('🔄 Iniciando setup de base de datos...');

      // Crear tabla de control de migraciones si no existe
      await this.createMigrationTable();

      // Ejecutar migraciones SQL
      await this.runSQLMigrations();

      logger.info('✅ Setup de base de datos completado');

    } catch (error) {
      logger.error('❌ Error en setup de base de datos:', error);
      throw new Error(`Database setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Ejecuta solo los seeds de datos (desarrollo/testing)
   */
  public async runSeeds(): Promise<void> {
    if (config.nodeEnv === 'production') {
      logger.warn('⚠️  Seeds deshabilitados en producción');
      return;
    }

    try {
      logger.info('🌱 Ejecutando seeds de datos...');

      // Crear tabla de control de seeds si no existe
      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS seed_history (
          id SERIAL PRIMARY KEY,
          version VARCHAR(50) NOT NULL,
          description VARCHAR(255),
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          success BOOLEAN DEFAULT TRUE
        );
      `);

      const seedDir = path.join(__dirname, '../main/resources/db/seed');
      
      if (!fs.existsSync(seedDir)) {
        logger.warn('⚠️  Directorio de seeds no encontrado');
        return;
      }

      const files = fs.readdirSync(seedDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const version = file.split('__')[0];
        const isRepeatable = file.startsWith('R__');
        
        // Para archivos R_ (repeatable), siempre ejecutar (son idempotentes)
        if (isRepeatable) {
          logger.info(`🔄 Archivo R_ detectado: ${file} - ejecutando (idempotente)`);
          
          // Eliminar registros anteriores del mismo archivo R_
          await AppDataSource.query(
            'DELETE FROM seed_history WHERE version = $1',
            [version]
          );
        } else {
          // Para archivos V_ (versioned), verificar si ya se ejecutó
          const existing = await AppDataSource.query(
            'SELECT * FROM seed_history WHERE version = $1',
            [version]
          );

          if (existing.length > 0) {
            continue; // Ya ejecutado
          }
        }

        try {
          logger.info(`🌱 Ejecutando seed: ${file}`);
          
          const filePath = path.join(seedDir, file);
          const sql = fs.readFileSync(filePath, 'utf8');
          
          await AppDataSource.query(sql);
          
          // Registrar seed ejecutado
          await AppDataSource.query(
            'INSERT INTO seed_history (version, description) VALUES ($1, $2)',
            [version, file]
          );

          logger.info(`✅ Seed ${version} ejecutado exitosamente`);
          
        } catch (error) {
          logger.error(`❌ Error en seed ${file}:`, error);
          // No fallar la aplicación si los seeds fallan
          logger.warn('⚠️  Continuando sin este seed...');
        }
      }

    } catch (error) {
      logger.error('❌ Error ejecutando seeds:', error);
      // No fallar la aplicación si los seeds fallan
      logger.warn('⚠️  Continuando sin seeds...');
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

      // Obtener seeds ejecutados (si existe la tabla)
      let seeds = [];
      try {
        seeds = await AppDataSource.query(
          'SELECT * FROM seed_history ORDER BY executed_at DESC'
        );
      } catch {
        // Tabla de seeds no existe aún
      }

      return {
        migrations: migrations.length,
        seeds: seeds.length,
        lastMigration: migrations[0]?.version || 'None',
        lastSeed: seeds[0]?.version || 'None',
        status: 'connected'
      };
    } catch (error) {
      logger.error('Error obteniendo información de migraciones:', error);
      return {
        migrations: 0,
        seeds: 0,
        lastMigration: 'Error',
        lastSeed: 'Error',
        status: 'error'
      };
    }
  }
}
