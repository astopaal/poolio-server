import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Question } from './Question';

@Entity('question_options')
export class QuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  text: string;

  @Column({ type: 'int', nullable: true })
  order: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    value?: number | string;
    color?: string;
    icon?: string;
  };

  @ManyToOne(() => Question, question => question.options)
  question: Question;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 