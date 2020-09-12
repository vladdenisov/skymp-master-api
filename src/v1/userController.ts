import { Context } from "koa";
import * as Router from "koa-router";
import { getManager, Repository } from "typeorm";
import { validate, ValidationError } from "class-validator";

import { hashString } from "../utils/hashString";
import { User, VERIFICATION_EXPIRES } from "../models/user";
import { sendSignupSuccess, sendSignupResetPin } from "../emails";
import { randomString } from "../utils/random-string";

export class UserController {
  static getRouter(): Router {
    return new Router()
      .post("/users", UserController.createUser)
      .post("/users/:id/verify", UserController.verify)
      .post("/users/:id/reset-pin", UserController.resetPin);
  }

  static getRepository(ctx: Context | Router.RouterContext): Repository<User> {
    return getManager(
      (ctx as Record<string, string>)["connectionName"]
    ).getRepository(User);
  }

  static async createUser(ctx: Context | Router.RouterContext): Promise<void> {
    const userRepository = UserController.getRepository(ctx);

    const { name, email, password } = ctx.request.body;

    const user: User = new User();
    user.name = name;
    user.email = email;
    user.password = password;
    user.verificationPin = randomString(6);

    const errors: ValidationError[] = await validate(user, {
      skipMissingProperties: true
    });

    if (errors.length > 0) {
      ctx.status = 400;
      ctx.body = errors;
    } else if (await userRepository.findOne({ email: user.email })) {
      ctx.status = 400;
      ctx.body = "The specified e-mail address already exists";
    } else if (await userRepository.findOne({ name: user.name })) {
      ctx.status = 400;
      ctx.body = "A user with the same name already exists";
    } else {
      await userRepository.save(user);
      const actualUser = await userRepository.findOne({ email: user.email });
      if (actualUser) {
        ctx.status = 201;
        ctx.body = { id: actualUser.id };
      } else {
        ctx.status = 500;
        ctx.body = "findOne returned undefined unexpectedly";
      }
    }
  }

  static async verify(ctx: Context | Router.RouterContext): Promise<void> {
    const userRepository = UserController.getRepository(ctx);

    let id = +ctx.params.id;
    if (!Number.isInteger(id)) id = -1;

    const password = await hashString(
      "" + ctx.request.body.password,
      "" + ctx.request.body.email
    );

    const verificationPin = await hashString(
      "" + ctx.request.body.pin,
      "" + ctx.request.body.email
    );

    const updateResult = await userRepository.update(
      {
        id,
        verificationPin,
        password,
        hasVerifiedEmail: false
      },
      {
        hasVerifiedEmail: true
      }
    );

    if (updateResult.affected) {
      await sendSignupSuccess(ctx.request.body.email);
      ctx.status = 200;
    } else {
      ctx.throw(404);
    }
  }

  static async resetPin(ctx: Context | Router.RouterContext): Promise<void> {
    const userRepository = UserController.getRepository(ctx);

    let id = +ctx.params.id;
    if (!Number.isInteger(id)) id = -1;

    const email = ctx.request.body.email;

    const password = await hashString(
      "" + ctx.request.body.password,
      "" + email
    );

    const user = await userRepository.findOne({ id, email, password });

    if (!user) {
      ctx.throw(400, "User not found with like this id, email and password");
    } else if (user.hasVerifiedEmail) {
      ctx.throw(400, "User has verified email");
    } else if (
      new Date().getTime() - user.verificationPinSentAt.getTime() >
      VERIFICATION_EXPIRES
    ) {
      ctx.throw(400, "Code is expired");
    } else {
      const newPin = randomString(6);

      // Maybe override EntityRepository method save ???
      user.verificationPin = await hashString(newPin, user.email);

      user.verificationPinSentAt = new Date();

      await userRepository.save(user);

      ctx.status = 200;

      sendSignupResetPin(user.email, user.name, newPin);
    }
  }
}
