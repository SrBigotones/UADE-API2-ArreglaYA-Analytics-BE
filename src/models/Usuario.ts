import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('usuarios')
@Index(['id_usuario'], { unique: true })
@Index(['rol', 'estado'])
@Index(['estado'])
@Index(['created_at'])
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

  @Column({ type: 'varchar', length: 100, nullable: true })
  ubicacion: string | null; // ciudad o provincia (solo para prestadores)

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'fecha_baja' })
  fecha_baja: Date | null; // Fecha cuando el usuario se dio de baja
}

