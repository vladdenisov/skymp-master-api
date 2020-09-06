import * as Router from "koa-router";

import { router as v1 } from "./v1";

export const router = new Router();

router.use(v1.routes());
