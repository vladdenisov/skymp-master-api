import { getMyPublicIp } from "../../src/utils/publicIp";
import { TestUtilsProvider } from "../../src/utils/testUtils";
import {
  LegacyController,
  defaultServerTimeout
} from "../../src/v1/legacyController";

beforeEach(TestUtilsProvider.beforeEach);
afterEach(TestUtilsProvider.afterEach);

it("should be able to update server data", async () => {
  const { api } = TestUtilsProvider;
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
