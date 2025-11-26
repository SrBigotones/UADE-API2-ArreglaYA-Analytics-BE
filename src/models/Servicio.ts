import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('servicios')
@Index(['id_servicio'], { unique: true })
@Index(['id_usuario'])
@Index(['activo'])
@Index(['timestamp'])
export class Servicio {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'bigint', name: 'id_servicio', nullable: false })
  id_servicio: number;

  @Column({ type: 'bigint', name: 'id_usuario', nullable: false })
  id_usuario: number;

  @Column({ type: 'boolean', nullable: false, default: true })
  activo: boolean;

  @Column({ type: 'timestamptz', nullable: false })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}

