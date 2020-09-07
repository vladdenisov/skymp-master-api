import * as Koa from "koa";
import * as helmet from "koa-helmet";
import * as logger from "koa-logger";
import * as cors from "@koa/cors";
import * as koaBody from "koa-body";
import { Connection } from "typeorm";
import { router } from "./routes";
import * as Router from "koa-router";

export class App {
  constructor(connection: Connection) {
    if (!connection.isConnected)
      throw new Error("The app requires an active database connection to run");

    this.app = new Koa();
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(logger());
    this.app.use(koaBody({ multipart: true }));

    const appRouter = new Router({
      prefix: "/api"
    });
    appRouter.use(router.routes()).use(router.allowedMethods());
    this.app.use(appRouter.routes()).use(appRouter.allowedMethods());

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
  }

  private app: Koa;
  private onClose = new Array<() => void>();
}
