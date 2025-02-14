import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Question } from './Question';
import { Response } from './Response';

@Entity('answers')
export class Answer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Response, response => response.answers, { onDelete: 'CASCADE' })
  response: Response;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  question: Question;

  @Column('jsonb')
  value: {
    text?: string;
    choice?: string;
    choices?: string[];
    rating?: number;
    scale?: number;
  };

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  answeredAt: Date;
} 