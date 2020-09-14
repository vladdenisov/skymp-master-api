import { createConnection, getManager, Repository } from "typeorm";
import Axios, { AxiosInstance } from "axios";
import * as fs from "fs";
import * as parseCsv from "csv-parse/lib/sync";

import { prefix, StatsElement } from "./statsManager";
import { entities } from "../models";
import { App } from "../app";
import { User } from "../models/user";
import { config } from "../cfg";
import { hashString } from "./hashString";

export interface TestUserInfo {
  user: User;
}

let app_: App;
let api_: AxiosInstance;
let users_: Repository<User>;
let testPort_ = 7777;

export interface CreateTestUserOptions {
  hasVerifiedEmail: boolean;
}

export class TestUtilsProvider {
  static get app(): App {
    return app_;
  }

  static get users(): Repository<User> {
    return users_;
  }

  static get api(): AxiosInstance {
    return api_;
  }

  static get testPort(): number {
    return testPort_;
  }

  static get statsCsvPath(): string {
    return "./temp.csv";
  }

  static async createTestUser(
    options: CreateTestUserOptions = { hasVerifiedEmail: false }
  ): Promise<TestUserInfo> {
    const usr: User = new User();
    usr.hasVerifiedEmail = options.hasVerifiedEmail;
    usr.name = "igor";
    usr.email = "lelele@test.be";
    usr.password = "jejeje";
    usr.verificationPin = "qwerty";
    usr.verificationPinSentAt = new Date();
    await TestUtilsProvider.users.save(usr);

    const user = await TestUtilsProvider.users.findOne({
      verificationPin: await hashString("qwerty", "lelele@test.be")
    });
    expect(user).not.toBeFalsy();
    if (!user) return { user: usr };

    return { user };
  }

  static async getStats(): Promise<Array<StatsElement>> {
    const v: string = (await TestUtilsProvider.api.get("/stats")).data;

    const res: Array<StatsElement> = parseCsv(v, {
      columns: true,
      skip_empty_lines: true
    });
    return res;
  }

  static async beforeEach(): Promise<void> {
    ++testPort_;
    fs.writeFileSync(TestUtilsProvider.statsCsvPath, prefix);
    const connection = await createConnection({
      type: "postgres",
      url: config.DB_URL + "_test",
      logging: false,
      synchronize: true,
      entities: entities,
      name: "conn" + Math.random().toString()
    });
    app_ = new App(connection, {
      enableLogging: false,
      statsCsvPath: TestUtilsProvider.statsCsvPath
    });
    await TestUtilsProvider.app.listen(TestUtilsProvider.testPort);

    api_ = Axios.create({
      baseURL: `http://localhost:${TestUtilsProvider.testPort}/api/`
    });

    users_ = getManager(TestUtilsProvider.app.connectionName).getRepository(
      User
    );
  }

  static async afterEach(): Promise<void> {
    await TestUtilsProvider.users.clear();
    TestUtilsProvider.app.close();
  }
}
