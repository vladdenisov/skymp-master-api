import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";

import { Length, IsEmail } from "class-validator";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("text")
  @Length(2, 32)
  name!: string;

  @Column("text")
  @Length(5, 100)
  @IsEmail()
  email!: string;

  @Column("text")
  hashedPassword!: string;

  @CreateDateColumn()
  createAt!: Date;

  @UpdateDateColumn()
  updateAt!: Date;
}
