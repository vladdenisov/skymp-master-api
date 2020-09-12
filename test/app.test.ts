import { createConnection, getManager, Repository } from "typeorm";
import Axios, { AxiosInstance } from "axios";
import * as https from "https";
import * as parseCsv from "csv-parse/lib/sync";
import * as fs from "fs";

import { entities } from "../src/models";
import { App } from "../src/app";
import { User, VERIFICATION_EXPIRES } from "../src/models/user";
import { getConfig } from "../src/cfg";
import { hashString } from "../src/utils/hashString";
import {
  latestVersion,
  LegacyController,
  defaultServerTimeout
} from "../src/v1/legacyController";
import { StatsElement, StatsManager } from "../src/utils/statsManager";
import { getMyPublicIp } from "../src/utils/publicIp";
import { prefix } from "../src/utils/statsManager";
import { makeStatsElement } from "../src/utils/makeStatsElement";

const testPort = 7777;
const statsCsvPath = "./temp.csv";

let app: App;
let api: AxiosInstance;
let users: Repository<User>;

beforeEach(async () => {
  fs.writeFileSync(statsCsvPath, prefix);
  const connection = await createConnection({
    type: "postgres",
    url: getConfig().DB_URL + "_test",
    logging: false,
    synchronize: true,
    entities: entities,
    name: "conn" + Math.random().toString()
  });
  app = new App(connection, {
    enableLogging: false,
    statsCsvPath
  });
  await app.listen(testPort);

  api = Axios.create({
    baseURL: `http://localhost:${testPort}/api/`
  });

  users = getManager(app.connectionName).getRepository(User);
});

afterEach(async () => {
  await users.clear();
  app.close();
});

interface TestUserInfo {
  user: User;
}

const createTestUser = async (): Promise<TestUserInfo> => {
  const usr: User = new User();
  usr.hasVerifiedEmail = false;
  usr.name = "igor";
  usr.email = "lelele@test.be";
  usr.password = "jejeje";
  usr.verificationPin = "qwerty";
  usr.verificationPinSentAt = new Date();
  await users.save(usr);

  const user = await users.findOne({
    verificationPin: await hashString("qwerty", "lelele@test.be")
  });
  expect(user).not.toBeFalsy();
  if (!user) return { user: usr };

  return { user };
};

const getStats = async (): Promise<Array<StatsElement>> => {
  const v: string = (await api.get("/stats")).data;

  const res: Array<StatsElement> = parseCsv(v, {
    columns: true,
    skip_empty_lines: true
  });
  return res;
};

describe("StatsManager", () => {
  it("should throw if file doesn't exist", async () => {
    expect(() => new StatsManager("!@()*#&")).toThrowError(
      "'!@()*#&' does not exist"
    );
  });

  it("should throw if file has invalid format", async () => {
    expect(() => new StatsManager("package.json")).toThrowError(
      `'package.json' does not have required prefix`
    );
  });

  it("should throw if file has invalid format", async () => {
    const statsManager = new StatsManager(statsCsvPath);
    expect(statsManager.get().length).toEqual(0);

    statsManager.add({ Time: "x", ServersOnline: "y", PlayersOnline: "z" });

    const data = statsManager.get();

    expect(data).toEqual([
      { Time: "x", ServersOnline: "y", PlayersOnline: "z" }
    ]);

    expect(
      parseCsv(fs.readFileSync(statsCsvPath, "utf-8"), {
        columns: true,
        skip_empty_lines: true
      })
    ).toEqual([{ Time: "x", ServersOnline: "y", PlayersOnline: "z" }]);
  });
});

describe("makeStatsElement", () => {
  it("should correctly compress server data into the stats element", async () => {
    const date = new Date(0);
    expect(makeStatsElement(date, [])).toEqual({
      Time: "1970/01/01 00:00:00",
      PlayersOnline: "0",
      ServersOnline: "0"
    });

    expect(makeStatsElement(date, [{ online: 1 }, { online: 1000 }])).toEqual({
      Time: "1970/01/01 00:00:00",
      PlayersOnline: "1001",
      ServersOnline: "2"
    });
  });
});

describe("Backward compatibility", () => {
  it("should act like /v1 prefix when no prefix specified", async () => {
    const first = (await api.get("/hello")).data;
    const second = (await api.get("/v1/hello")).data;
    expect(first).toEqual("HELLO WORLD");
    expect(second).toEqual("HELLO WORLD");
  });
});

describe("Legacy routes", () => {
  it("should provide correct download url", async () => {
    const downloadUrl: string = (await api.get("/skymp_link/5.0.6.1")).data;

    expect(downloadUrl.startsWith("https://github.com")).toBeTruthy();

    const headers: Record<string, unknown> = await new Promise((r) => {
      https.get(downloadUrl, (res) => {
        https.get(res.headers["location"] as string, (result) => {
          r(result.headers);
        });
      });
    });

    expect(headers["content-length"]).toEqual("84684972");
  });

  it("should provide correct skse download url", async () => {
    const downloadUrl: string = (
      await api.get("/skse_link/5.maybe.incorrect.version")
    ).data;
    expect(downloadUrl).toEqual(
      "https://skse.silverlock.org/beta/skse64_2_00_19.7z"
    );
  });

  it("should return lastest version", async () => {
    const v: string = (await api.get("/latest_version")).data;
    expect(v).toEqual(latestVersion);
  });

  it("should return correct statistics", async () => {
    const res = await getStats();

    expect(
      res.findIndex(
        (x) =>
          x.PlayersOnline === "0" &&
          x.ServersOnline === "1" &&
          x.Time === "2020/07/14 12:06:03"
      )
    ).toEqual(0);
    expect(
      res.findIndex(
        (x) =>
          x.PlayersOnline === "3" &&
          x.ServersOnline === "1" &&
          x.Time === "2020/09/11 22:07:17"
      )
    ).toEqual(83108);
  });

  it("should be able to update server data", async () => {
    const myIp = await getMyPublicIp();

    expect((await api.get("/servers")).data).toEqual([]);

    const res = await api.post(`/servers/${myIp}:7777`, {
      name: "MyServer",
      maxPlayers: "30",
      online: "1"
    });
    expect(res.data).toEqual("Nice");

    expect((await api.get("/servers")).data).toEqual([
      {
        name: "MyServer",
        maxPlayers: 30,
        ip: myIp,
        port: 7777,
        online: 1
      }
    ]);

    LegacyController.serverTimeout = 0;
    expect((await api.get("/servers")).data).toEqual([]);
    LegacyController.serverTimeout = defaultServerTimeout;
  });

  it("should update stats when servers update their data", async () => {
    const myIp = await getMyPublicIp();
    const was = (await getStats()).length;

    await api.post(`/servers/${myIp}:7777`, {
      name: "MyServer",
      maxPlayers: "30",
      online: "1"
    });

    const now = (await getStats()).length;

    expect(now - was).toEqual(1);

    const st = await getStats();
    expect(st[st.length - 1].PlayersOnline).toEqual("1");
    expect(st[st.length - 1].ServersOnline).toEqual("1");

    const after = (await getStats()).length;
    expect(after).toEqual(now);
  });
});

describe("User system", () => {
  it("should be able to create a new account", async () => {
    expect(await users.count({})).toEqual(0);

    const res = await api.post("/users", {
      name: "GeneralEasterEgg",
      email: "bar@example.com",
      password: "no-clientside-hashing-plz"
    });
    expect(res.status).toEqual(201);
    expect(typeof res.data.id).toEqual("number");

    expect(await users.count({})).toEqual(1);

    const user = await users.findOne({ name: "GeneralEasterEgg" });
    expect(user).not.toBeFalsy();
    if (user) {
      expect(user.verificationPin.length).toEqual(32);

      expect(Math.abs(Date.now() - +user.verificationPinSentAt)).toBeLessThan(
        1000
      );

      expect(user.hasVerifiedEmail).toBeFalsy();
    }
  });

  it("should throw 404 when trying to verify email of unexisting user", async () => {
    for (const id in ["yay", "1000000000", "-1"])
      await expect(api.post(`/users/${id}/verify`, {})).rejects.toThrowError(
        "Request failed with status code 404"
      );
  });

  it("should throw 404 when trying to verify email using bad PIN", async () => {
    const { user } = await createTestUser();
    await expect(
      api.post(`/users/${user.id}/verify`, {
        pin: "BAD_PIN",
        password: "jejeje",
        email: "lelele@test.be"
      })
    ).rejects.toThrowError("Request failed with status code 404");
  });

  it("should throw 404 when trying to verify email using bad PASSWORD", async () => {
    const { user } = await createTestUser();
    await expect(
      api.post(`/users/${user.id}/verify`, {
        pin: "qwerty",
        password: "BAD_PASS",
        email: "lelele@test.be"
      })
    ).rejects.toThrowError("Request failed with status code 404");
  });

  it("should throw 404 when trying to verify email using bad EMAIL", async () => {
    const { user } = await createTestUser();
    await expect(
      api.post(`/users/${user.id}/verify`, {
        pin: "qwerty",
        password: "jejeje",
        email: "BAD_EMAIL"
      })
    ).rejects.toThrowError("Request failed with status code 404");
  });

  it("should throw 404 when trying to verify email when email is already verified", async () => {
    const { user } = await createTestUser();
    user.hasVerifiedEmail = true;
    await users.save(user);
    await expect(
      api.post(`/users/${user.id}/verify`, {
        pin: "qwerty",
        password: "jejeje",
        email: "lelele@test.be"
      })
    ).rejects.toThrowError("Request failed with status code 404");
  });

  it("should be able to verify user's email", async () => {
    const { user } = await createTestUser();

    expect(await users.count({ hasVerifiedEmail: true })).toEqual(0);

    const res = await api.post(`/users/${user.id}/verify`, {
      pin: "qwerty",
      password: "jejeje",
      email: "lelele@test.be"
    });
    expect(res.status).toEqual(200);
    expect(await users.count({ hasVerifiedEmail: true })).toEqual(1);
  });

  // TODO: Test expiration of pin codes
  it("should fail to create accounts with same emails", async () => {
    expect(await users.count({})).toEqual(0);
    const res = await api.post("/users", {
      name: "GeneralEasterEgg",
      email: "bar@example.com",
      password: "no-clientside-hashing-plz"
    });
    expect(res.status).toEqual(201);

    expect(await users.count({})).toEqual(1);

    await expect(
      api.post("/users", {
        name: "Inferno",
        email: "bar@example.com",
        password: "asdasdz"
      })
    ).rejects.toThrow();
    expect(await users.count({})).toEqual(1);
  });

  it("should be able to recreate pin when valid input data", async () => {
    const { user } = await createTestUser();
    const prevPin = user.verificationPin;

    const res = await api.post(`/users/${user.id}/reset-pin`, {
      email: user.email,
      password: "jejeje"
    });
    expect(res.status).toEqual(200);
    expect(await users.count({ verificationPin: prevPin })).toEqual(0);

    const updatedUser = await users.findOne({ id: user.id });
    expect(updatedUser).not.toBeFalsy();
    if (updatedUser) {
      expect(
        await users.count({
          verificationPin: updatedUser.verificationPin
        })
      ).toEqual(1);
    }
  });

  it("should fail to reset pin with same input data", async () => {
    const { user } = await createTestUser();

    await expect(
      api.post(`/users/${user.id}/reset-pin`, {
        email: user.email,
        password: "BAD_PASSWORD"
      })
    ).rejects.toThrow();
  });

  it("should fail to reset pin for user has verified email", async () => {
    const { user } = await createTestUser();
    user.hasVerifiedEmail = true;

    await users.save(user);

    await expect(
      api.post(`/users/${user.id}/reset-pin`, {
        email: user.email,
        password: "jejeje"
      })
    ).rejects.toThrow();
  });

  it("should fail to reset pin when code is expired", async () => {
    const { user } = await createTestUser();
    user.verificationPinSentAt = new Date(
      new Date().getTime() - VERIFICATION_EXPIRES - 1000
    );

    await users.save(user);

    await expect(
      api.post(`/users/${user.id}/reset-pin`, {
        email: user.email,
        password: "jejeje"
      })
    ).rejects.toThrow();
  });
});
