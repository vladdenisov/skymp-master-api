import { createConnection, getManager, Repository } from "typeorm";
import Axios, { AxiosInstance } from "axios";

import { entities } from "../src/models";
import { App } from "../src/app";
import { User } from "../src/models/user";
import { getConfig } from "../src/cfg";
import { VERIFICATION_EXPIRES_TIME_VALUE } from "../src/models/user";
import { hashString } from "../src/utils/hashString";

const testPort = 7777;

let app: App;
let api: AxiosInstance;
let users: Repository<User>;

beforeEach(async () => {
  const connection = await createConnection({
    type: "postgres",
    url: getConfig().DB_URL + "_test",
    logging: false,
    synchronize: true,
    entities: entities,
    name: "conn" + Math.random().toString()
  });
  app = new App(connection, { enableLogging: false });
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
  usr.verificationPinExpiresAt = new Date(Date.now() + 1000000);
  usr.verificationPinSentAt = new Date();
  await users.save(usr);

  const user = await users.findOne({
    verificationPin: await hashString("qwerty", "lelele@test.be")
  });
  expect(user).not.toBeFalsy();
  if (!user) return { user: usr };

  return { user };
};

describe("Backward compatibility", () => {
  it("should act like /v1 prefix when no prefix specified", async () => {
    const first = (await api.get("/hello")).data;
    const second = (await api.get("/v1/hello")).data;
    expect(first).toEqual("HELLO WORLD");
    expect(second).toEqual("HELLO WORLD");
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

      expect(
        Math.abs(
          Date.now() +
            VERIFICATION_EXPIRES_TIME_VALUE -
            +user.verificationPinExpiresAt
        )
      ).toBeLessThan(1000);

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
});
