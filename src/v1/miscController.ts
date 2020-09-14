import { Context } from "koa";
import * as Router from "koa-router";

import { withAuth } from "../middlewares/auth";
import { Roles } from "../models/user";

export class MiscController {
  public static getRouter(): Router {
    return new Router()
      .get("/hello", MiscController.hello)
      .get("/secure", withAuth(), MiscController.secure)
      .get("/secure/user", withAuth([Roles.user]), MiscController.secure)
      .get("/secure/admin", withAuth([Roles.admin]), MiscController.secure)
      .get("/secure/guest", withAuth([], false), MiscController.secure);
  }

  public static async hello(
    ctx: Context | Router.RouterContext
  ): Promise<void> {
    ctx.body = "HELLO WORLD";
  }

  public static async secure(
    ctx: Context | Router.RouterContext
  ): Promise<void> {
    ctx.body = "SECURE ROUTE";
  }
}
