import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Repository,
  EntityRepository
} from "typeorm";
import { Length, IsEmail, validate, ValidationError } from "class-validator";

import { hashString } from "../utils/hashString";

export const VERIFICATION_EXPIRES = 2 * 60 * 1000;

export enum Roles {
  user = "user",
  admin = "admin"
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @PrimaryColumn("varchar", { length: 32, nullable: false, unique: true })
  @Length(2, 32)
  name!: string;

  @PrimaryColumn("varchar", { length: 100, unique: true, nullable: false })
  @Length(5, 100)
  @IsEmail()
  email!: string;

  @Column("varchar", { name: "password", nullable: false, length: 100 })
  @Length(6)
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
    name: "verification_pin_sent_at",
    nullable: true,
    default: null
  })
  verificationPinSentAt!: Date;

  /*
  Not work with enum
  https://github.com/typeorm/typeorm/issues/4350
  */
  @Column("varchar", {
    name: "roles",
    default: `{${Roles.user}}`,
    nullable: false,
    array: true
  })
  roles!: Roles[];

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
}

export interface CreateUserProps {
  name: string;
  email: string;
  password: string;
  verificationPin: string;
}

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  async CreateAndSave(props: CreateUserProps): Promise<User | void> {
    const user = new User();
    user.name = props.name;
    user.email = props.email;
    user.password = props.password;
    user.verificationPin = props.verificationPin;

    const errors: ValidationError[] = await validate(user, {
      skipMissingProperties: true
    });

    if (errors.length > 0) {
      throw new Error(errors.toString());
    }

    user.password = await this.hashed(user.password, user.email);
    user.verificationPin = await this.hashed(user.verificationPin, user.email);
    user.verificationPinSentAt = new Date();

    this.save(user);
  }

  hashed(field: string, email: string): Promise<string> {
    return hashString(field, email);
  }
}
