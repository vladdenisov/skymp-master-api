import { Context } from "koa";
import * as Router from "koa-router";
import { getManager, Repository, Not, Equal } from "typeorm";
import { validate, ValidationError } from "class-validator";
import { hash } from "bcrypt";

import { User } from "models/user";

export class UserController {
  static getRouter() {
    return new Router()
      .get("/users", UserController.getUsers)
      .get("/users/:id", UserController.getUser)
      .post("/users", UserController.createUser)
      .put("/users/:id", UserController.updateUser)
      .delete("/users/:id", UserController.deleteUser);
  }

  static async getUsers(ctx: Context | Router.RouterContext) {
    const userRepository: Repository<User> = getManager().getRepository(User);

    const users: User[] = await userRepository.find();

    ctx.status = 200;
    ctx.body = users;
  }

  static async getUser(ctx: Context | Router.RouterContext) {
    const userRepository: Repository<User> = getManager().getRepository(User);

    const user = await userRepository.findOne(ctx.params.id);

    if (user) {
      ctx.status = 200;
      ctx.body = user;
    } else {
      ctx.status = 400;
      ctx.body = "User not found";
    }
  }

  private static hash(input: string): Promise<string> {
    const saltRounds = 10;
    return new Promise<string>((resolve, reject) => {
      hash(input, saltRounds, (err, hash) =>
        err ? reject(err) : resolve(hash)
      );
    });
  }

  static async createUser(ctx: Context | Router.RouterContext) {
    const userRepository: Repository<User> = getManager(
      (ctx as Record<string, string>)["connectionName"]
    ).getRepository(User);

    const { name, email, password } = ctx.request.body;

    const user: User = new User();
    user.name = name;
    user.email = email;
    user.hashedPassword = await UserController.hash(password);

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

  static async updateUser(ctx: Context | Router.RouterContext) {
    const userRepository: Repository<User> = getManager().getRepository(User);

    const user = await userRepository.findOne(ctx.params.id);

    if (!user) {
      ctx.status = 400;
      ctx.body = "The user you are trying to retrieve doesn't exist in the db";
    } else {
      if (ctx.request.body.name) {
        user.name = ctx.request.body.name;
      }

      if (ctx.request.body.email) {
        user.email = ctx.request.body.email;
      }
      if (ctx.request.body.hashedPassword) {
        user.hashedPassword = ctx.request.body.hashedPassword;
      }

      const errors: ValidationError[] = await validate(user);

      if (errors.length > 0) {
        ctx.status = 400;
        ctx.body = errors;
      } else if (!(await userRepository.findOne(user.id))) {
        ctx.status = 400;
        ctx.body = "The user you are trying to update doesn't exist in the db";
      } else if (
        await userRepository.findOne({
          id: Not(Equal(user.id)),
          email: user.email
        })
      ) {
        ctx.status = 400;
        ctx.body = "The specified e-mail address already exists";
      } else {
        const userUpdated = await userRepository.save(user);
        ctx.status = 201;
        ctx.body = userUpdated;
      }
    }
  }

  static async deleteUser(ctx: Context | Router.RouterContext) {
    const userRepository: Repository<User> = getManager().getRepository(User);

    const userToRemove = await userRepository.findOne(ctx.params.id);

    if (!userToRemove) {
      ctx.status = 400;
      ctx.body = "User doesn't exist";
    } else {
      await userRepository.remove(userToRemove);
      ctx.status = 204;
    }
  }
}
