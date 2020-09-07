import { MiscController } from "./miscController";
import { UserController } from "./userController";
import * as Router from "koa-router";

export const getRouter = () => {
  return new Router()
    .use(UserController.getRouter().routes())
    .use(MiscController.getRouter().routes());
};
