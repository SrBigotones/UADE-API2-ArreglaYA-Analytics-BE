import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('solicitudes')
@Index(['id_usuario'])
@Index(['id_prestador'])
@Index(['estado'])
@Index(['zona'])
@Index(['timestamp'])
@Index(['es_critica'])
export class Solicitud {
  @PrimaryColumn({ type: 'bigint', name: 'id_solicitud' })
  id_solicitud: number;

  @Column({ type: 'bigint', name: 'id_usuario', nullable: false })
  id_usuario: number;

  @Column({ type: 'bigint', name: 'id_prestador', nullable: true })
  id_prestador: number | null;

  @Column({ type: 'varchar', length: 20, nullable: false })
  estado: string; // 'creada' / 'cancelada' / 'aceptada' / 'rechazada'

  @Column({ type: 'varchar', length: 100, nullable: true })
  zona: string | null;

  @Column({ type: 'timestamp', nullable: false })
  timestamp: Date;

  @Column({ type: 'boolean', nullable: false, default: false, name: 'es_critica' })
  es_critica: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

