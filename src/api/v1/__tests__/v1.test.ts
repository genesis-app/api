import { expect, test } from "bun:test";
import supertest from "supertest";

import { app } from "../../../";
import { getUser } from "../../../sql";
import { deleteUserRequest, updateRequest, updateResponse } from "..";

const request = supertest(app);

let userUuid: string;

test("log user", async () => {
  const res = await request
    .post("/api/v1/update")
    .send({
      plugins: {},
      version: "0.0.0",
    } as updateRequest)
    .then((res) => res.body as updateResponse);
  userUuid = res.uuid;
  const user = getUser(userUuid);
  expect(user).not.toBeNull();
  expect(user?.version).toBe("0.0.0");
});

test("log known user", async () => {
  const res = await request
    .post("/api/v1/update")
    .send({
      plugins: {},
      uuid: userUuid,
      version: "0.0.0",
    } as updateRequest)
    .then((res) => res.body as updateResponse);
  expect(res.uuid).toBe(userUuid);
});

test("check genesis update", async () => {
  const res1 = await request
    .post("/api/v1/update")
    .send({
      uuid: userUuid,
      plugins: {},
      version: "0.0.0",
    } as updateRequest)
    .then((res) => res.body as updateResponse);
  expect(res1.updateAvailable).toBe(true);
  const res2 = await request
    .post("/api/v1/update")
    .send({
      uuid: userUuid,
      plugins: {},
      version: "0.0.0b",
    } as updateRequest)
    .then((res) => res.body as updateResponse);
  expect(res2.updateAvailable).toBe(false); // beta versions should not be updated
});

test("check plugin update", async () => {
  const res1 = await request
    .post("/api/v1/update")
    .send({
      uuid: userUuid,
      plugins: {
        "xyz.genesisapp.testPlugin": {
          version: 0,
          enabled: true,
          proxied: true,
        },
      },
      version: "0.0.0",
    } as updateRequest)
    .then((res) => res.body as updateResponse);
  expect(Object.keys(res1.pluginUpdates)).toContain(
    "xyz.genesisapp.testPlugin",
  );

  const res2 = await request
    .post("/api/v1/update")
    .send({
      uuid: userUuid,
      plugins: {
        "xyz.genesisapp.testPlugin": {
          version: 0,
          enabled: false,
          proxied: true,
        },
      },
      version: "0.0.0",
    } as updateRequest)
    .then((res) => res.body as updateResponse);
  expect(Object.keys(res2.pluginUpdates)).not.toContain(
    "xyz.genesisapp.testPlugin",
  ); // disabled plugins should not be updated

  const res3 = await request
    .post("/api/v1/update")
    .send({
      uuid: userUuid,
      plugins: {
        "xyz.genesisapp.testPlugin": {
          version: 0,
          enabled: true,
          proxied: false,
        },
      },
      version: "0.0.0",
    } as updateRequest)
    .then((res) => res.body as updateResponse);
  expect(Object.keys(res3.pluginUpdates)).not.toContain(
    "xyz.genesisapp.testPlugin",
  ); // unproxied plugins should not be updated
});

test("check deleted plugin", async () => {
  const res = await request
    .post("/api/v1/update")
    .send({
      uuid: userUuid,
      plugins: {
        "xyz.genesisapp.inexistantplugin": {
          version: 0,
          enabled: true,
          proxied: true,
        },
      },
      version: "0.0.0",
    } as updateRequest)
    .then((res) => res.body as updateResponse);
  expect(res.deletedPlugins).toContain("xyz.genesisapp.inexistantplugin");
});

test("delete user", async () => {
  const res = await request
    .post("/api/v1/delete")
    .send({
      uuid: userUuid,
    } as deleteUserRequest)
    .then((res) => res.body);
  expect(res).toEqual({});
  const user = getUser(userUuid);
  expect(user).toBeNull();
});
