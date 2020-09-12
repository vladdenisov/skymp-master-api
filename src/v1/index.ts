import * as Router from "koa-router";

import { MiscController } from "./miscController";
import { UserController } from "./userController";
import { LegacyController } from "./legacyController";

export const getRouter = (): Router => {
  return new Router()
    .use(UserController.getRouter().routes())
    .use(MiscController.getRouter().routes())
    .use(LegacyController.getRouter().routes());
};
