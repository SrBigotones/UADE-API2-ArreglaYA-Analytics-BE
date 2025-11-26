import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('rubros')
@Index(['id_rubro'], { unique: true })
@Index(['nombre_rubro'])
export class Rubro {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'bigint', name: 'id_rubro', nullable: false })
  id_rubro: number;

  @Column({ type: 'varchar', length: 100, nullable: false, name: 'nombre_rubro' })
  nombre_rubro: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}

