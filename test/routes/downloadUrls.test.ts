import * as https from "https";

import { TestUtilsProvider } from "../../src/utils/testUtils";
import { latestVersion } from "../../src/v1/legacyController";

beforeEach(TestUtilsProvider.beforeEach);
afterEach(TestUtilsProvider.afterEach);

describe("Download URLs and info", () => {
  it("should provide correct download url", async () => {
    const { api } = TestUtilsProvider;
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
    const { api } = TestUtilsProvider;
    const downloadUrl: string = (
      await api.get("/skse_link/5.maybe.incorrect.version")
    ).data;
    expect(downloadUrl).toEqual(
      "https://skse.silverlock.org/beta/skse64_2_00_19.7z"
    );
  });

  it("should return lastest version", async () => {
    const { api } = TestUtilsProvider;
    const v: string = (await api.get("/latest_version")).data;
    expect(v).toEqual(latestVersion);
  });
});
