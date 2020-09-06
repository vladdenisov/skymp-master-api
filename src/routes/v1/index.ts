import { Context } from "koa";
import * as Router from "koa-router";

import { v1 } from "controllers";

export const router = new Router({
  prefix: "/v1"
});

router.get("/hello", (ctx: Context | Router.RouterContext) => {
  ctx.status = 200;
  ctx.body = "HELLO WORLD";
});

router.get("/users", v1.UserController.getUsers);
router.get("/users/:id", v1.UserController.getUser);
router.post("/users", v1.UserController.createUser);
router.put("/users/:id", v1.UserController.updateUser);
router.delete("/users/:id", v1.UserController.deleteUser);
