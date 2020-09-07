import { createConnection } from "typeorm";
import { entities } from "../src/models";
import { App } from "../src/app";
import Axios, { AxiosInstance } from "axios";
import * as fs from "fs";

const testPort = 7777;

let app: App;
let api: AxiosInstance;

beforeEach(async () => {
  const sqliteDbPath = "./temp.sqlite";
  if (fs.existsSync(sqliteDbPath)) fs.unlinkSync(sqliteDbPath);

  const connection = await createConnection({
    type: "sqlite",
    database: sqliteDbPath,
    entities: entities,
    logging: false,
    synchronize: true,
    name: "conn" + Math.random().toString()
  });
  app = new App(connection, { enableLogging: false });
  await app.listen(testPort);

  api = Axios.create({
    baseURL: `http://localhost:${testPort}/api/`
  });
});

afterEach(async () => {
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
    const res = await api.post("/users", {
      name: "GeneralEasterEgg",
      email: "bar@example.com",
      password: "no-clientside-hashing-plz"
    });
    expect(res.status).toEqual(201);
  });
});
