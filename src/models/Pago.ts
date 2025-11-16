import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pagos')
@Index(['id_pago'], { unique: true })
@Index(['id_usuario'])
@Index(['id_prestador'])
@Index(['id_solicitud'])
@Index(['estado'])
@Index(['timestamp_creado'])
@Index(['metodo'])
export class Pago {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'bigint', name: 'id_pago', nullable: false })
  id_pago: number;

  @Column({ type: 'bigint', name: 'id_usuario', nullable: true })
  id_usuario: number | null;

  @Column({ type: 'bigint', name: 'id_prestador', nullable: true })
  id_prestador: number | null;

  @Column({ type: 'bigint', name: 'id_solicitud', nullable: true })
  id_solicitud: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false, name: 'monto_total', transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  monto_total: number;

  @Column({ type: 'varchar', length: 10, nullable: false, default: 'ARS' })
  moneda: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  metodo: string | null;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'pending' })
  estado: string; // 'pending' / 'approved' / 'rejected' / 'expired' / 'refunded'

  @Column({ type: 'timestamp', nullable: false, name: 'timestamp_creado' })
  timestamp_creado: Date;

  @Column({ type: 'timestamp', nullable: false, name: 'timestamp_actual' })
  timestamp_actual: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'captured_at' })
  captured_at: Date | null;

  @Column({ type: 'bigint', nullable: true, name: 'refund_id' })
  refund_id: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

