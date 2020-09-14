import { Middleware } from "koa";
import * as Passport from "koa-passport";
import * as LocalStrategy from "passport-local";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { getManager } from "typeorm";

import { hashString } from "./hashString";
import { User } from "../models/user";

import { config } from "../cfg";

export enum Strategies {
  jwt = "jwt",
  local = "local"
}

export const passportInit = (connectionName: string): Middleware => {
  const userRepository = getManager(connectionName).getRepository(User);

  Passport.use(
    new LocalStrategy.Strategy(
      {
        usernameField: "email",
        passwordField: "password",
        session: false
      },
      async (email: string, password: string, done) => {
        const hashPassword = await hashString(password, email);

        const user = await userRepository.findOne({
          email: email,
          password: hashPassword
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
        secretOrKey: config.JWT_SECRET
      },
      async (payload, done) => {
        const user = await userRepository.findOne({
          id: payload.id,
          email: payload.email,
          hasVerifiedEmail: payload.hasVerifiedEmail
        });

        if (!user) {
          return done(null, false);
        }

        return done(null, user);
      }
    )
  );

  return Passport.initialize();
};
