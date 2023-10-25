import { afterAll, beforeAll } from "bun:test";

import { addPlugin, database, initDb } from "../src/sql";
import { testPlugin } from "./data";

beforeAll(async () => {
  await initDb(":memory:");

  addPlugin(testPlugin);
});
afterAll(async () => {
  database.close();
});
