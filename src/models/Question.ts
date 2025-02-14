import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Survey } from './Survey';
import { QuestionOption } from './QuestionOption';
import { Answer } from './Answer';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  text: string;

  @Column({
    type: 'enum',
    enum: ['text', 'number', 'single_choice', 'multiple_choice', 'rating', 'date'],
    default: 'text'
  })
  type: 'text' | 'number' | 'single_choice' | 'multiple_choice' | 'rating' | 'date';

  @Column({ default: false })
  isRequired: boolean;

  @Column({ type: 'int', nullable: true })
  order: number;

  @Column({ type: 'jsonb', nullable: true })
  validations?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };

  @ManyToOne(() => Survey, survey => survey.questions)
  survey: Survey;

  @OneToMany(() => QuestionOption, option => option.question)
  options: QuestionOption[];

  @OneToMany(() => Answer, answer => answer.question)
  answers: Answer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 