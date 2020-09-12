import { TestUtilsProvider } from "../../src/utils/testUtils";

beforeEach(TestUtilsProvider.beforeEach);
afterEach(TestUtilsProvider.afterEach);

describe("Backward compatibility", () => {
  it("should act like /v1 prefix when no prefix specified", async () => {
    const { api } = TestUtilsProvider;
    const first = (await api.get("/hello")).data;
    const second = (await api.get("/v1/hello")).data;
    expect(first).toEqual("HELLO WORLD");
    expect(second).toEqual("HELLO WORLD");
  });
});
