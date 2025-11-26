import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('solicitudes')
@Index(['id_solicitud'], { unique: true })
@Index(['id_usuario'])
@Index(['id_prestador'])
@Index(['estado'])
@Index(['zona'])
@Index(['created_at'])
@Index(['es_critica'])
export class Solicitud {
  @PrimaryColumn({ type: 'bigint', name: 'id_solicitud' })
  id_solicitud: number;

  @Column({ type: 'bigint', name: 'id_usuario', nullable: true })
  id_usuario: number | null;

  @Column({ type: 'bigint', name: 'id_prestador', nullable: true })
  id_prestador: number | null;

  @Column({ type: 'boolean', nullable: false, default: false, name: 'prestador_asignado' })
  prestador_asignado: boolean;

  @Column({ type: 'bigint', name: 'id_habilidad', nullable: true })
  id_habilidad: number | null;

  @Column({ type: 'varchar', length: 20, nullable: false })
  estado: string; // 'creada' / 'cancelada' / 'aceptada' / 'rechazada'

  @Column({ type: 'varchar', length: 100, nullable: true })
  zona: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'fecha_confirmacion' })
  fecha_confirmacion: Date | null;

  @Column({ type: 'boolean', nullable: false, default: false, name: 'es_critica' })
  es_critica: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}

