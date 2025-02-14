import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { Survey } from './Survey';
import { Company } from './Company';

export type UserRole = 'super_admin' | 'company_admin' | 'editor' | 'viewer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: ['super_admin', 'company_admin', 'editor', 'viewer'],
    default: 'editor'
  })
  role: UserRole;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ nullable: true })
  lastLogin?: Date;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Company, company => company.users)
  company: Company;

  @OneToMany(() => Survey, survey => survey.creator)
  surveys: Survey[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 