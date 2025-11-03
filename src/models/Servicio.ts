import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('servicios')
@Index(['id_usuario'])
@Index(['activo'])
@Index(['timestamp'])
export class Servicio {
  @PrimaryColumn({ type: 'bigint', name: 'id_servicio' })
  id_servicio: number;

  @Column({ type: 'bigint', name: 'id_usuario', nullable: false })
  id_usuario: number;

  @Column({ type: 'boolean', nullable: false, default: true })
  activo: boolean;

  @Column({ type: 'timestamp', nullable: false })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

