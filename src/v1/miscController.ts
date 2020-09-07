import { Context } from "koa";
import * as Router from "koa-router";

export class MiscController {
  public static getRouter() {
    return new Router().get("/hello", MiscController.hello);
  }

  public static async hello(ctx: Context | Router.RouterContext) {
    ctx.body = "HELLO WORLD";
  }
}
