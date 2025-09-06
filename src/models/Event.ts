import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('events')
@Index(['squad', 'topico', 'evento'])
@Index(['timestamp'])
@Index(['processed'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  squad: string;

  @Column({ type: 'varchar', length: 100 })
  topico: string;

  @Column({ type: 'varchar', length: 100 })
  evento: string;

  @Column({ type: 'json' })
  cuerpo: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
