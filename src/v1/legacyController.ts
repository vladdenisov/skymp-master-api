import { Context } from "koa";
import * as Router from "koa-router";
import { makeStatsElement } from "../utils/makeStatsElement";
import { cloneStructured } from "../utils/cloneStructured";
import { prefix, StatsManager } from "../utils/statsManager";
import { AmazonApi } from "../utils/aws";
import * as cfg from "../cfg";

const ipAndPortRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]):[0-9]+$/;

const playerLimit = 50000;

export interface ServerOnline {
  online: number;
}

export interface Server extends ServerOnline {
  name: string;
  maxPlayers: number;
  ip: string;
  port: number;
  lastUpdate?: Date;
}

const g_servers = new Map<string, Server>();

export const defaultServerTimeout = 10 * 1000;

export const defaultStatsUpdateRate = 60 * 1000;

const historicalStatsManager = new StatsManager("./data/stats0911.csv");

export class LegacyController {
  public static serverTimeout = defaultServerTimeout;
  public static statsUpdateRate = defaultStatsUpdateRate;
  public static amazonApi = new AmazonApi(
    cfg.config.S3_AWS_ACCESS_KEY_ID,
    cfg.config.S3_AWS_SECRET_ACCESS_KEY
  );

  static getRouter(): Router {
    return new Router()
      .get("/skymp_link/:skympver", LegacyController.getSkympLink)
      .get("/skse_link/:skympver", LegacyController.getSkseLink)
      .get("/latest_version", LegacyController.getLatestVersion)
      .get("/stats", LegacyController.getStats)
      .get("/servers", LegacyController.getServers)
      .post("/servers/:address", LegacyController.createOrUpdateServer)
      .get("/products", LegacyController.getProducts)
      .get("/products/:product", LegacyController.getProductInfo);
  }

  static async getSkympLink(
    ctx: Context | Router.RouterContext
  ): Promise<void> {
    if (!ctx.params.skympver.startsWith("5."))
      return ctx.throw(400, "Bad multiplayer version");

    const product = "skymp-client";
    const builds = await LegacyController.amazonApi.listObjects(
      product + "-builds"
    );
    const obj = builds
      .filter((x) => x.fileName.includes(ctx.params.skympver))
      .pop();
    if (obj) {
      ctx.body = obj.downloadUrl;
    } else {
      ctx.throw(
        404,
        "Unable to find skymp-client with version " + ctx.params.skympver
      );
    }
  }

  static async getSkseLink(ctx: Context | Router.RouterContext): Promise<void> {
    if (!ctx.params.skympver.startsWith("5."))
      return ctx.throw(400, "Bad multiplayer version");
    ctx.body = "https://skymp.io/skse64_2_00_19.7z";
  }

  static async getLatestVersion(
    ctx: Context | Router.RouterContext
  ): Promise<void> {
    const product = "skymp-client";
    const builds = await LegacyController.amazonApi.listObjects(
      product + "-builds"
    );
    if (builds.length === 0) {
      return ctx.throw(404, "Unable to find any skymp-client builds");
    }
    const build = builds[0];
    ctx.body = build.fileName.slice(product.length + 1, -".zip".length);
  }

  static async getStats(ctx: Context | Router.RouterContext): Promise<void> {
    const statsManager = LegacyController.getStatsManager(ctx);
    const stats = historicalStatsManager.get().concat(statsManager.get());
    let statsDump = prefix;
    stats.forEach(
      (element) =>
        (statsDump += `${element.Time},${element.PlayersOnline},${element.ServersOnline}\n`)
    );
    ctx.body = statsDump;
  }

  static async getServers(ctx: Context | Router.RouterContext): Promise<void> {
    await LegacyController.removeOutdatedServers();

    const res = Array.from(g_servers).map((pair) => cloneStructured(pair[1]));
    res.forEach((server) => delete server.lastUpdate);
    ctx.body = res;
  }

  static async createOrUpdateServer(
    ctx: Context | Router.RouterContext
  ): Promise<void> {
    if (!ctx.params.address.match(ipAndPortRegex)) {
      return ctx.throw(
        400,
        "Address must contain IP and port (i.e. 127.0.0.1:7777)"
      );
    }
    const [ip, port] = ctx.params.address.split(":");
    if (!ctx.ip.startsWith("::") && ctx.ip !== ip) {
      return ctx.throw(
        403,
        `Your IP is expected to be ${ip}, but it is ${ctx.ip}`
      );
    }

    console.log(ctx.request.body);

    const server: Server = {
      ip: ip,
      port: +port,
      name: "" + (ctx.request.body.name || "Yet Another Scamp Server"),
      maxPlayers: +ctx.request.body.maxPlayers || playerLimit,
      online: +ctx.request.body.online,
      lastUpdate: new Date()
    };

    if (server.maxPlayers > playerLimit) server.maxPlayers = playerLimit;
    if (server.maxPlayers < 1) server.maxPlayers = 1;
    server.maxPlayers = Math.floor(server.maxPlayers);

    if ("" + server.online === "NaN") server.online = 0;
    if (server.online > server.maxPlayers) server.online = server.maxPlayers;
    if (server.online < 0) server.online = 0;
    server.online = Math.floor(server.online);

    g_servers.set(ctx.params.address, server);

    LegacyController.updateStats(LegacyController.getStatsManager(ctx));

    ctx.body = "Nice";
  }

  private static async getProducts(ctx: Context | Router.RouterContext) {
    ctx.body = ["skymp-server-lite-win32", "skymp-client", "skyrim-platform"];
  }

  private static async getProductInfo(ctx: Context | Router.RouterContext) {
    const builds = await LegacyController.amazonApi.listObjects(
      ctx.params.product + "-builds"
    );
    ctx.body = {
      builds
    };
  }

  private static updateStats(st: StatsManager) {
    const lastAdd = st.getLastAddMoment();
    if (
      !lastAdd ||
      Date.now() - lastAdd.getTime() > LegacyController.statsUpdateRate
    ) {
      const serverList = Array.from(g_servers).map((pair) => pair[1]);
      st.add(makeStatsElement(new Date(), serverList));
    }
  }

  private static getStatsManager(
    ctx: Context | Router.RouterContext
  ): StatsManager {
    return (ctx as Record<string, StatsManager>)["statsManager"];
  }

  private static async removeOutdatedServers() {
    const toRemove = new Array<string>();
    for (const [address, server] of g_servers) {
      if (
        server.lastUpdate &&
        Date.now() - server.lastUpdate.getTime() >=
          LegacyController.serverTimeout
      )
        toRemove.push(address);
    }
    toRemove.forEach((item) => g_servers.delete(item));
  }
}
