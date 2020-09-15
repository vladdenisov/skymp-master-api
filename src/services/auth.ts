import * as jwt from "jsonwebtoken";
import * as Passport from "koa-passport";
import * as LocalStrategy from "passport-local";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { Middleware } from "koa";
import { getManager } from "typeorm";

import { Roles, User, UserRepository } from "../models/user";

export enum Strategies {
  jwt = "jwt",
  local = "local"
}

export interface JwtPayload {
  id: string;
  email: string;
  hasVerifiedEmail: boolean;
  roles: Roles[];
}

export class AuthService {
  constructor(connectionName: string, jwtSecret: string) {
    AuthService._jwtSecret = jwtSecret;
    AuthService._connectionName = connectionName;
  }

  static readonly strategies = Strategies;

  private static _jwtSecret: string;

  private static _connectionName: string;

  static init(): Middleware {
    Passport.use(
      new LocalStrategy.Strategy(
        {
          usernameField: "email",
          passwordField: "password",
          session: false
        },
        async (email: string, password: string, done) => {
          const userRepository = AuthService.getRepository();

          const hashedPassword = await userRepository.hashed(password, email);

          const user = await userRepository.findOne({
            email: email,
            password: hashedPassword
          });

          if (!user) {
            return done(null, false, {
              message: "User does not exist or wrong password"
            });
          }

          return done(null, user);
        }
      )
    );

    Passport.use(
      new JwtStrategy(
        {
          jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
          secretOrKey: AuthService._jwtSecret
        },
        async (payload: JwtPayload, done) => {
          const userRepository = AuthService.getRepository();
          const user = await userRepository.findOne({
            id: Number.parseInt(payload.id),
            email: payload.email,
            hasVerifiedEmail: payload.hasVerifiedEmail,
            roles: payload.roles
          });

          if (!user) {
            return done(null, false);
          }

          return done(null, user);
        }
      )
    );

    return Passport.initialize();
  }

  private static getRepository(): UserRepository {
    return getManager(AuthService._connectionName).getCustomRepository(
      UserRepository
    );
  }

  static createToken = ({
    id,
    email,
    hasVerifiedEmail,
    roles
  }: JwtPayload): string => {
    return jwt.sign(
      { id, email, hasVerifiedEmail, roles },
      AuthService._jwtSecret
    );
  };

  static login(
    strategy: Strategies,
    callback:
      | ((err: unknown, user: User, ...args: unknown[]) => unknown)
      | undefined
  ): Middleware {
    return Passport.authenticate(strategy, callback);
  }
}
