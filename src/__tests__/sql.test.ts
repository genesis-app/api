import { expect, test } from "bun:test";
import { randomUUID } from "crypto";

import { testPlugin, testPlugin2 } from "../../test/data";
import { ADMIN_IDS } from "..";
import {
  addPlugin,
  database,
  deletePlugin,
  deleteUser,
  getDevByPlugin,
  getPlugin,
  getUser,
  updateUser,
} from "../sql";

const userName = randomUUID();

test("initDb", () => {
  expect(database.serialize().length).toBeGreaterThan(0);
});

test("getUser unknown", () => {
  expect(getUser(userName)).toBeNull();
});

test("create user", () => {
  const oldUser = getUser(userName);
  expect(oldUser).toBeNull();
  const time = Date.now();
  updateUser(userName, time, "0.0.0", {});
  const newUser = getUser(userName);
  expect(newUser).not.toBeNull();
  expect(newUser?.lastPing).toBe(time);
});

test("update user", () => {
  updateUser(userName, 0);
  const oldUser = getUser(userName);
  expect(oldUser).not.toBeNull();
  expect(oldUser?.lastPing).toBe(0);
  const time = Date.now();
  updateUser(userName, time);
  const newUser = getUser(userName);
  expect(newUser).not.toBeNull();
  expect(newUser?.lastPing).toBe(time);
});

test("sql injection", () => {
  const test1 = getUser(`${userName}' OR 1=1; --`);
  expect(test1).toBeNull();
  const test2 = getUser(`${userName}' OR 1=1; DROP TABLE users; --`);
  expect(test2).toBeNull();
});

test("delete user", () => {
  updateUser(userName);
  const oldUser = getUser(userName);
  expect(oldUser).not.toBeNull();
  deleteUser(userName);
  const newUser = getUser(userName);
  expect(newUser).toBeNull();
});

test("create plugin", () => {
  const plugin = getPlugin("xyz.genesisapp.testPlugin"); // from test/data.ts
  expect(plugin).toEqual(testPlugin);
});

test("create dev", () => {
  const dev = getDevByPlugin("xyz.genesisapp.testPlugin");
  expect(dev).not.toBeNull();
  expect(dev?.id).toBe(ADMIN_IDS[0]);
  expect(dev?.plugins).toEqual(["xyz.genesisapp.testPlugin"]);
});

test("update dev", () => {
  const dev = getDevByPlugin("xyz.genesisapp.testPlugin");
  expect(dev).not.toBeNull();
  expect(dev?.id).toBe(ADMIN_IDS[0]);
  expect(dev?.plugins).toEqual(["xyz.genesisapp.testPlugin"]);

  addPlugin(testPlugin2);

  const dev2 = getDevByPlugin("xyz.genesisapp.testPlugin2");
  expect(dev2).not.toBeNull();
  expect(dev2?.id).toBe(ADMIN_IDS[0]);
  expect(dev2?.plugins).toEqual([
    "xyz.genesisapp.testPlugin",
    "xyz.genesisapp.testPlugin2",
  ]);
});

test("delete plugin", () => {
  const oldPlugin = getPlugin("xyz.genesisapp.testPlugin2");
  expect(oldPlugin).toEqual(testPlugin2);
  deletePlugin("xyz.genesisapp.testPlugin2");
  const newPlugin = getPlugin("xyz.genesisapp.testPlugin2");
  expect(newPlugin).toBeNull();
});

test("delete dev", () => {
  const dev = getDevByPlugin("xyz.genesisapp.testPlugin");
  expect(dev).not.toBeNull();
  expect(dev?.id).toBe(ADMIN_IDS[0]);
  expect(dev?.plugins).toEqual(["xyz.genesisapp.testPlugin"]);

  deletePlugin("xyz.genesisapp.testPlugin");

  const dev2 = getDevByPlugin("xyz.genesisapp.testPlugin");
  expect(dev2).toBeNull();
});

test("create dev 2", () => {
  const dev = getDevByPlugin("xyz.genesisapp.testPlugin");
  expect(dev).toBeNull();

  addPlugin(testPlugin);

  const dev2 = getDevByPlugin("xyz.genesisapp.testPlugin");
  expect(dev2).not.toBeNull();
  expect(dev2?.id).toBe(ADMIN_IDS[0]);
  expect(dev2?.plugins).toEqual(["xyz.genesisapp.testPlugin"]);
});
