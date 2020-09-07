import * as Koa from "koa";
import * as helmet from "koa-helmet";
import * as logger from "koa-logger";
import * as cors from "@koa/cors";
import * as koaBody from "koa-body";
import { Connection } from "typeorm";
import * as Router from "koa-router";
import { getRouter } from "./v1";

export interface AppOptions {
  enableLogging: boolean;
}

export class App {
  constructor(connection: Connection, options: AppOptions) {
    if (!connection.isConnected)
      throw new Error("The app requires an active database connection to run");

    this.app = new Koa()
      .use(helmet())
      .use(cors())
      .use(koaBody({ multipart: true }));

    if (options.enableLogging) this.app.use(logger());

    const v1 = getRouter();
    const router = new Router({
      prefix: "/api"
    })
      .use(v1.routes())
      .use("/v1", v1.routes());
    this.app.use(router.routes()).use(router.allowedMethods());

    this.onClose.push(() => connection.close());
  }

  listen(port: number): Promise<void> {
    return new Promise((resolve) => {
      const server = this.app.listen(port, resolve);
      this.onClose.push(() => server.close());
    });
  }

  close() {
    this.onClose.forEach((f) => f());
    this.onClose = [];
  }

  private app: Koa;
  private onClose = new Array<() => void>();
}
