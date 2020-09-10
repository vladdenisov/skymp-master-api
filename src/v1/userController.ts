import { Context } from "koa";
import * as Router from "koa-router";
import { getManager, Repository } from "typeorm";
import { validate, ValidationError } from "class-validator";

import { User } from "../models/user";

export class UserController {
  static getRouter(): Router {
    return new Router().post("/users", UserController.createUser);
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

    const errors: ValidationError[] = await validate(user, {
      skipMissingProperties: true
    });

    if (errors.length > 0) {
      ctx.status = 400;
      ctx.body = errors;
    } else if (await userRepository.findOne({ email: user.email })) {
      ctx.status = 400;
      ctx.body = "The specified e-mail address already exists";
    } else {
      const userCreated = await userRepository.save(user);
      ctx.status = 201;
      ctx.body = userCreated;
    }
  }
}
