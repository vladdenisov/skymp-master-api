import * as Router from "koa-router";

import { MiscController } from "./miscController";
import { UserController } from "./userController";

export const getRouter = (): Router => {
  return new Router()
    .use(UserController.getRouter().routes())
    .use(MiscController.getRouter().routes());
};
