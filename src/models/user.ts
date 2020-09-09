import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  PrimaryColumn,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent
} from "typeorm";
import { hash } from "bcrypt";
import { Length, IsEmail } from "class-validator";

import { sendSignupVerifyCode } from "../emails";
import { randomString } from "../utils/random-string";

const SALT_ROUNDS = 10;
const VERIFICATION_EXPIRES_TIME_VALUE = 3600 * 4 * 1000; // 4h

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

  @Column("boolean", {
    name: "has_verified_email",
    default: false,
    nullable: false
  })
  hasVerifiedEmail!: boolean;

  @Column("varchar", {
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
  updateAt!: Date;

  @BeforeInsert()
  async hashPassword(): Promise<void> {
    this.password = await hash(this.password, SALT_ROUNDS);
  }
}

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  listenTo(): typeof User {
    return User;
  }

  async afterInsert(event: InsertEvent<User>): Promise<void> {
    const pin = randomString(6);
    const hashedPin = await hash(pin, SALT_ROUNDS);
    const verificationPinSentAt = new Date();
    const verificationPinExpiresAt = new Date(
      verificationPinSentAt.getTime() + VERIFICATION_EXPIRES_TIME_VALUE
    );

    await event.manager.update(
      User,
      {
        id: event.entity.id
      },
      {
        verificationPin: hashedPin,
        verificationPinSentAt: verificationPinSentAt,
        verificationPinExpiresAt: verificationPinExpiresAt
      }
    );

    sendSignupVerifyCode(event.entity.email, event.entity.name, pin);
  }
}
