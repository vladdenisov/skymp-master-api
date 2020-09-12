import { makeStatsElement } from "../src/utils/makeStatsElement";
import { TestUtilsProvider } from "../src/utils/testUtils";

beforeEach(TestUtilsProvider.beforeEach);
afterEach(TestUtilsProvider.afterEach);

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
