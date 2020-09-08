import { createConnection, getManager, Repository } from "typeorm";
import Axios, { AxiosInstance } from "axios";

import { entities } from "../src/models";
import { App } from "../src/app";
import { User } from "../src/models/user";
import { getConfig } from "../src/cfg";

const testPort = 7777;

let app: App;
let api: AxiosInstance;
let users: Repository<User>;

beforeEach(async () => {
  const connection = await createConnection({
    type: "postgres",
    url: getConfig().DB_URL + "_test",
    logging: ["query", "error"],
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

    expect(await users.count({})).toEqual(1);
  });

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
