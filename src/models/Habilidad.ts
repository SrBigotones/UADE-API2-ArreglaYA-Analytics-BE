import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('habilidades')
@Index(['id_usuario'])
@Index(['id_habilidad'])
@Index(['nombre_habilidad'])
@Index(['id_rubro'])
export class Habilidad {
  @PrimaryColumn({ type: 'bigint', name: 'id_usuario' })
  id_usuario: number;

  @PrimaryColumn({ type: 'bigint', name: 'id_habilidad' })
  id_habilidad: number;

  @Column({ type: 'varchar', length: 100, nullable: false, name: 'nombre_habilidad' })
  nombre_habilidad: string;

  @Column({ type: 'bigint', nullable: true, name: 'id_rubro' })
  id_rubro: number | null;

  @Column({ type: 'boolean', nullable: false, default: true })
  activa: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

