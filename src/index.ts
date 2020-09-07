import { createConnection } from "typeorm";

import { getConfig } from "cfg";
import { App } from "app";
import { entities } from "models";

const config = getConfig();

createConnection({
  type: "postgres",
  url: config.DB_URL,
  logging: ["query", "error"],
  synchronize: true,
  entities: entities
})
  .then(async (connection) => {
    const app = new App(connection, { enableLogging: true });
    await app.listen(config.PORT);
    console.log(`Server started on port ${config.PORT}.`);
  })
  .catch((error: string) => {
    console.log("DB connection error: ", error);
  });
