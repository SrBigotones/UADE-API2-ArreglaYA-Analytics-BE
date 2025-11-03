import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('zonas')
@Index(['id_usuario'])
@Index(['id_zona'])
@Index(['nombre_zona'])
export class Zona {
  @PrimaryColumn({ type: 'bigint', name: 'id_usuario' })
  id_usuario: number;

  @PrimaryColumn({ type: 'bigint', name: 'id_zona' })
  id_zona: number;

  @Column({ type: 'varchar', length: 100, nullable: false, name: 'nombre_zona' })
  nombre_zona: string;

  @Column({ type: 'boolean', nullable: false, default: true })
  activa: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

