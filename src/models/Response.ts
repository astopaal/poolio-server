import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Survey } from './Survey';
import { User } from './User';
import { Answer } from './Answer';

@Entity('responses')
export class Response {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Survey, { onDelete: 'CASCADE' })
  survey: Survey;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  respondent?: User;

  @Column({ nullable: true })
  anonymousId?: string;

  @OneToMany(() => Answer, answer => answer.response, { cascade: true })
  answers: Answer[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    location?: {
      country?: string;
      city?: string;
    };
    completionTime?: number; // milisaniye cinsinden
  };

  @Column({ default: true })
  isCompleted: boolean;

  @CreateDateColumn()
  createdAt: Date;
} 