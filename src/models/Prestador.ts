import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('prestadores')
@Index(['id_prestador'], { unique: true })
@Index(['estado'])
@Index(['timestamp'])
@Index(['perfil_completo'])
@Index(['estado', 'perfil_completo'])
export class Prestador {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'bigint', name: 'id_prestador', nullable: false })
  id_prestador: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nombre: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  apellido: string | null;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'activo' })
  estado: string; // 'activo' / 'baja'

  @Column({ type: 'timestamp', nullable: false })
  timestamp: Date;

  @Column({ type: 'boolean', nullable: false, default: false, name: 'perfil_completo' })
  perfil_completo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

