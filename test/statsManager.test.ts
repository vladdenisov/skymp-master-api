import * as fs from "fs";
import * as parseCsv from "csv-parse/lib/sync";

import { StatsManager } from "../src/utils/statsManager";
import { TestUtilsProvider } from "../src/utils/testUtils";

beforeEach(TestUtilsProvider.beforeEach);
afterEach(TestUtilsProvider.afterEach);

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
    const statsManager = new StatsManager(TestUtilsProvider.statsCsvPath);
    expect(statsManager.get().length).toEqual(0);

    statsManager.add({ Time: "x", ServersOnline: "y", PlayersOnline: "z" });

    const data = statsManager.get();

    expect(data).toEqual([
      { Time: "x", ServersOnline: "y", PlayersOnline: "z" }
    ]);

    expect(
      parseCsv(fs.readFileSync(TestUtilsProvider.statsCsvPath, "utf-8"), {
        columns: true,
        skip_empty_lines: true
      })
    ).toEqual([{ Time: "x", ServersOnline: "y", PlayersOnline: "z" }]);
  });
});
