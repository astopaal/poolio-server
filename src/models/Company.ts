import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './User';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  logo?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'jsonb', nullable: true })
  settings?: {
    theme?: {
      primaryColor?: string;
      secondaryColor?: string;
    };
    features?: {
      maxSurveys?: number;
      maxQuestionsPerSurvey?: number;
      allowFileUpload?: boolean;
      allowCustomDomain?: boolean;
    };
  };

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => User, user => user.company)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 