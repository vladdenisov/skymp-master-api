import { createConnection } from "typeorm";
import { entities } from "../src/db/entities";
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
    name: "conn" + Math.random().toString()
  });
  app = new App(connection);
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
