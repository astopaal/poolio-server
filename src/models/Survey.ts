import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './User';
import { Question } from './Question';

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ nullable: true })
  startDate?: Date;

  @Column({ nullable: true })
  endDate?: Date;

  @Column({ default: 'draft' })
  status: 'draft' | 'active' | 'completed' | 'archived';

  @Column({ default: false })
  isPasswordProtected: boolean;

  @Column({ nullable: true })
  password?: string;

  @Column({ default: true })
  allowAnonymous: boolean;

  @ManyToOne(() => User, user => user.surveys)
  creator: User;

  @OneToMany(() => Question, question => question.survey)
  questions: Question[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 