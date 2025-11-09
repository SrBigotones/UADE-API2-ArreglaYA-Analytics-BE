import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('usuarios')
@Index(['id_usuario'], { unique: true })
@Index(['rol', 'estado'])
@Index(['estado'])
@Index(['timestamp'])
@Index(['ubicacion'])
export class Usuario {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'bigint', name: 'id_usuario', nullable: false })
  id_usuario: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  rol: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  estado: string; // 'activo' / 'baja' / 'rechazado'

  @Column({ type: 'timestamp', nullable: false })
  timestamp: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ubicacion: string | null; // ciudad o provincia (solo para prestadores)

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

