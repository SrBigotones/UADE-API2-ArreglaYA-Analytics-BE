import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cotizaciones')
@Index(['id_cotizacion'])
@Index(['id_solicitud'])
@Index(['id_usuario'])
@Index(['id_prestador'])
@Index(['estado'])
@Index(['timestamp'])
export class Cotizacion {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'bigint', name: 'id_cotizacion', nullable: true })
  id_cotizacion: number | null;

  @Column({ type: 'bigint', name: 'id_solicitud', nullable: false })
  id_solicitud: number;

  @Column({ type: 'bigint', name: 'id_usuario', nullable: true })
  id_usuario: number | null;

  @Column({ type: 'bigint', name: 'id_prestador', nullable: false })
  id_prestador: number;

  @Column({ type: 'varchar', length: 20, nullable: false })
  estado: string; // 'emitida' / 'aceptada' / 'rechazada' / 'expirada'

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: {
    to: (value: number | null) => value,
    from: (value: string | null) => value ? parseFloat(value) : null
  }})
  monto: number | null;

  @Column({ type: 'timestamp', nullable: false })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

