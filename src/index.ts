import cors from "cors";
import express from "express";
import { mkdirSync } from "fs";
import { exists } from "fs/promises";

import { apiRouter } from "./api";
import { authRouter } from "./auth/route";
import { checkPurge } from "./purge";
import { initDb } from "./sql";
export const app = express();

const PORT = 8080;
export const CurrentGenesisVersion = "0.0.1";

export const ADMIN_IDS = ["799319081723232267"];

if (!(await exists("./plugins"))) {
  await mkdirSync("./plugins");
}
if (!(await exists("./uploadtemp"))) {
  await mkdirSync("./uploadtemp");
}

if (!Bun.main.endsWith("test.ts")) initDb();

app.use(express.json());
app.use(cors());

app.use("/api", apiRouter);
app.use("/auth", authRouter);

if (!Bun.main.endsWith("data.ts")) {
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });

  setInterval(checkPurge, 1000 * 60 * 10);
  checkPurge();
}
