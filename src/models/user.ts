import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  PrimaryColumn,
  BeforeInsert
} from "typeorm";
import { hash } from "bcrypt";

import { Length, IsEmail } from "class-validator";

const SALT_ROUNDS = 10;

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @PrimaryColumn("varchar", { length: 32, nullable: false, unique: true })
  @Length(2, 32)
  name!: string;

  @PrimaryColumn("varchar", { length: 100, unique: true, nullable: false })
  @Length(5, 100)
  @IsEmail()
  email!: string;

  @Column("varchar", { name: "password", nullable: false, length: 100 })
  password!: string;

  @BeforeInsert()
  async hashPassword(): Promise<void> {
    const hashedPassword = await hash(this.password, SALT_ROUNDS);
    this.password = hashedPassword;
  }

  @Column("boolean", {
    name: "has_verified_email",
    default: false,
    nullable: false
  })
  hasVerifiedEmail!: boolean;

  /*@Column("varchar", {
    name: "verification_pin",
    nullable: true,
    default: null
  })
  verificationPin!: string;

  @Column("timestamp", {
    name: "verification_pin_expires_at",
    nullable: true,
    default: null
  })
  verificationPinExpiresAt!: Date;

  @Column("timestamp", {
    name: "verification_pin_sent_at",
    nullable: true,
    default: null
  })
  verificationPinSentAt!: Date;

  @CreateDateColumn({
    name: "create_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP"
  })
  createAt!: Date;

  @UpdateDateColumn({
    name: "update_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP"
  })
  updateAt!: Date;*/
}
