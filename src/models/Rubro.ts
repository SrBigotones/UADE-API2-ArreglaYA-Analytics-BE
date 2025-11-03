import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('rubros')
@Index(['nombre_rubro'])
export class Rubro {
  @PrimaryColumn({ type: 'bigint', name: 'id_rubro' })
  id_rubro: number;

  @Column({ type: 'varchar', length: 100, nullable: false, name: 'nombre_rubro' })
  nombre_rubro: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

