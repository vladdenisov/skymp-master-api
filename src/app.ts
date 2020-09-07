import * as Koa from "koa";
import * as helmet from "koa-helmet";
import * as logger from "koa-logger";
import * as cors from "@koa/cors";
import * as koaBody from "koa-body";
import { createConnection } from "typeorm";

import { getConfig } from "./cfg";
const config = getConfig();

import { entities } from "db/entities";
import { router } from "routes";

createConnection({
  type: "postgres",
  url: config.DB_URL,
  logging: ["query", "error"],
  synchronize: true,
  entities: entities
  // extra: {
  //   ssl: ""
  // }
})
  .then(async () => {
    const app = new Koa();

    app.use(helmet());
    app.use(cors());
    app.use(logger());
    app.use(koaBody({ multipart: true }));

    app.use(router.routes()).use(router.allowedMethods());

    app.listen(config.PORT, () => {
      console.log(`Server started on port ${config.PORT}.`);
    });
  })
  .catch((error: string) => {
    console.log("DB connection error: ", error);
  });
