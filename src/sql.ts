import Database from "bun:sqlite";

import { ADMIN_IDS } from ".";
import { randomToken } from "./utils";
export let database: Database;

export interface iBaseUser {
  uuid: string;
  lastPing: number;
  version: string;
}
export interface iUser extends iBaseUser {
  plugins: string[];
}
export interface iUserQuery extends iBaseUser {
  plugins: string;
}

interface iBasePlugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  versionCode: number;
  builtinVersion: number;
  extension: string;
  users: number;
}
interface iPluginQuery extends iBasePlugin {
  disabled: number;
  builtin: number;
}
export interface iPlugin extends iBasePlugin {
  disabled: boolean;
  builtin: boolean;
}
export interface iPluginDev {
  id: string;
  plugins: string[];
}
export interface iPluginDevQuery {
  id: string;
  plugins: string;
}

export function initDb(dbName: string = "db.sqlite") {
  if (database) {
    console.log("Closing database");
    database.close();
  }
  database = new Database(dbName);
  for (const query of [
    // Init users table
    database.prepare(`CREATE TABLE IF NOT EXISTS
      users(
        uuid TEXT NOT NULL PRIMARY KEY,
        lastPing INTEGER NOT NULL,
        version TEXT NOT NULL,
        plugins TEXT NOT NULL /* JSON array of plugin ids */
      )
    `),

    // Init plugins table
    database.prepare(`CREATE TABLE IF NOT EXISTS
      plugins(
        id TEXT NOT NULL PRIMARY KEY, /* like a bundle identifier */
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        author TEXT NOT NULL, /* user id */
        version TEXT NOT NULL,
        versionCode INTEGER NOT NULL, /* incremental version code, too lazy to parse x.y.z */
        disabled INTEGER NOT NULL,
        builtin INTEGER NOT NULL, /* if a plugin is built in to genesis */
        builtinVersion INTEGER NOT NULL, /* the version of genesis that the plugin was added */
        extension TEXT NOT NULL, /* the extension of the plugin file */
        users INTEGER NOT NULL /* number of users with the plugin */
      )
    `),

    // Init developers table
    database.prepare(`CREATE TABLE IF NOT EXISTS
      devs(
        id TEXT NOT NULL PRIMARY KEY, /* user id */
        plugins TEXT NOT NULL /* JSON array of plugin ids */
      )`),

    // Init access table
    database.prepare(`CREATE TABLE IF NOT EXISTS
      accessTokens(
        id TEXT NOT NULL PRIMARY KEY, /* user id */
        access_token TEXT NOT NULL
      )`),

    // Init meta table
    database.prepare(`CREATE TABLE IF NOT EXISTS
      metadata(
        key TEXT NOT NULL PRIMARY KEY,
        value TEXT NOT NULL
      )`),
  ]) {
    query.run();
  }
}

function fixUser(user: iUserQuery | null) {
  if (!user) return null;
  return {
    ...user,
    plugins: JSON.parse(user.plugins),
  } as iUser;
}

// take in a unix timestamp and return a list of users whos lastPing is older than the timestamp
export function getPurgableUsers(timestamp: number): iUser[] {
  return (
    database
      .query(
        `SELECT * FROM users
    WHERE lastPing < ?1`,
      )
      .all(timestamp) as iUserQuery[]
  ).map((i) => fixUser(i)!);
}

export function getUser(uuid: string): iUser | null {
  return fixUser(
    database
      .query(
        `SELECT * FROM users
    WHERE uuid = ?1`,
      )
      .get(uuid) as iUserQuery | null,
  );
}

export function updateUser(
  uuid: string,
  lastPing: number = Date.now(),
  version?: string,
  plugins: string[] = [],
) {
  const userExists = getUser(uuid);
  if (userExists) {
    database
      .prepare(
        `UPDATE users SET
      lastPing = ?2,
      version = ?3,
      plugins = ?4
      WHERE uuid = ?1;
    `,
      )
      .run(
        uuid,
        lastPing,
        version || userExists.version,
        JSON.stringify(plugins),
      );

    const oldPlugins = userExists.plugins;
    for (const plugin of plugins) {
      if (oldPlugins.includes(plugin)) continue;
      const pluginObj = getPlugin(plugin);
      if (!pluginObj) continue;
      pluginObj.users++;
      updatePlugin(plugin, pluginObj);
    }
  } else {
    database
      .prepare(
        `INSERT INTO users (uuid, lastPing, version, plugins) VALUES (?1, ?2, ?3, ?4);
    `,
      )
      .run(uuid, lastPing, version || "0.0.0", JSON.stringify(plugins));

    for (const plugin of plugins) {
      const pluginObj = getPlugin(plugin);
      if (!pluginObj) continue;
      pluginObj.users++;
      updatePlugin(plugin, pluginObj);
    }
  }
}

export function deleteUser(uuid: string) {
  const oldUser = getUser(uuid);
  database
    .prepare(
      `DELETE FROM users
    WHERE uuid = ?1;
  `,
    )
    .run(uuid);

  if (oldUser) {
    const plugins = oldUser.plugins;
    for (const plugin of plugins) {
      const pluginObj = getPlugin(plugin);
      if (!pluginObj) continue;
      pluginObj.users--;
      updatePlugin(plugin, pluginObj);
    }
  }
}

export function getPlugins(): iPlugin[] {
  const plugins = database
    .prepare(
      `SELECT * FROM plugins;
  `,
    )
    .all() as iPluginQuery[];
  return plugins.map((plugin) => ({
    ...plugin,
    disabled: !!plugin.disabled,
    builtin: !!plugin.builtin,
  }));
}

export function getEnabledPlugins(): iPlugin[] {
  const plugins = database
    .prepare(
      `SELECT * FROM plugins
        WHERE disabled = 0;
    `,
    )
    .all() as iPluginQuery[];
  return plugins.map((plugin) => ({
    ...plugin,
    disabled: !!plugin.disabled,
    builtin: !!plugin.builtin,
  }));
}

export function getDisabledPlugins(): iPlugin[] {
  const plugins = database
    .prepare(
      `SELECT * FROM plugins
        WHERE disabled = 1;
    `,
    )
    .all() as iPluginQuery[];
  return plugins.map((plugin) => ({
    ...plugin,
    disabled: !!plugin.disabled,
    builtin: !!plugin.builtin,
  }));
}

export function getPlugin(id: string): iPlugin | null {
  const plugin = database
    .prepare(
      `SELECT * FROM plugins
        WHERE id = ?1;
    `,
    )
    .get(id.toLowerCase()) as iPluginQuery | null;
  if (plugin === null) return null;
  return {
    ...plugin,
    disabled: !!plugin.disabled,
    builtin: !!plugin.builtin,
  };
}

export function getPluginsByDev(devId: string): iPlugin[] {
  if (ADMIN_IDS.includes(devId)) return getPlugins();
  const dev = getDev(devId);
  if (!dev) return [];
  return dev.plugins.map((pluginId) => getPlugin(pluginId.toLowerCase())!);
}

export function addPlugin(plugin: Omit<iPlugin, "users">) {
  database
    .prepare(
      `INSERT INTO plugins (id, name, description, author, version, versionCode, disabled, builtin, builtinVersion, extension, users) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10 ?11);
    `,
    )
    .run(
      plugin.id.toLowerCase(),
      plugin.name,
      plugin.description,
      plugin.author,
      plugin.version,
      plugin.versionCode,
      plugin.disabled ? 1 : 0,
      plugin.builtin ? 1 : 0,
      plugin.builtinVersion,
      plugin.extension,
      0,
    );

  if (!getDev(plugin.author))
    addDev({ id: plugin.author, plugins: [plugin.id.toLowerCase()] });
  else {
    addDevPlugin(plugin.author, plugin.id);
  }

  return getPlugin(plugin.id);
}

export function updatePlugin(id: string, plugin: Partial<iPlugin>) {
  if (plugin.author)
    database
      .prepare(`UPDATE plugins SET author = ?2 WHERE id = ?1;`)
      .run(id, plugin.author);

  if (plugin.description)
    database
      .prepare(`UPDATE plugins SET description = ?2 WHERE id = ?1;`)
      .run(id, plugin.description);

  if (plugin.disabled !== undefined)
    database
      .prepare(`UPDATE plugins SET disabled = ?2 WHERE id = ?1;`)
      .run(id, plugin.disabled ? 1 : 0);

  if (plugin.builtin !== undefined)
    database
      .prepare(`UPDATE plugins SET builtin = ?2 WHERE id = ?1;`)
      .run(id, plugin.builtin ? 1 : 0);

  if (plugin.version)
    database
      .prepare(`UPDATE plugins SET version = ?2 WHERE id = ?1;`)
      .run(id, plugin.version);

  if (plugin.versionCode)
    database
      .prepare(`UPDATE plugins SET versionCode = ?2 WHERE id = ?1;`)
      .run(id, plugin.versionCode);

  if (plugin.builtinVersion)
    database
      .prepare(`UPDATE plugins SET builtinVersion = ?2 WHERE id = ?1;`)
      .run(id, plugin.builtinVersion);

  if (plugin.name)
    database
      .prepare(`UPDATE plugins SET name = ?2 WHERE id = ?1;`)
      .run(id, plugin.name);

  if (plugin.extension)
    database
      .prepare(`UPDATE plugins SET extension = ?2 WHERE id = ?1;`)
      .run(id, plugin.extension);

  if (plugin.users)
    database
      .prepare(`UPDATE plugins SET users = ?2 WHERE id = ?1;`)
      .run(id, plugin.users);

  return getPlugin(id);
}

export function deletePlugin(id: string) {
  database
    .prepare(
      `DELETE FROM plugins
        WHERE id = ?1;
    `,
    )
    .run(id.toLowerCase());

  const dev = getDevByPlugin(id);
  if (!dev) return;
  dev.plugins.splice(dev.plugins.indexOf(id), 1);
  if (dev.plugins.length === 0) deleteDev(dev.id);
  else updateDev(dev);
}

export function getDevs(): iPluginDev[] {
  return database
    .prepare(
      `SELECT * FROM devs;
    `,
    )
    .all() as iPluginDev[];
}

export function getDev(id: string): iPluginDev | null {
  const dev = database
    .prepare(
      `SELECT * FROM devs
        WHERE id = ?1;
    `,
    )
    .get(id) as iPluginDevQuery | null;
  if (!dev) return null;
  dev.plugins = JSON.parse(dev.plugins);
  return dev as unknown as iPluginDev;
}

export function getDevByPlugin(pluginId: string) {
  const dev = database
    .prepare(
      `SELECT * FROM devs
        WHERE plugins LIKE ?1;
    `,
    )
    .get(`%${pluginId.toLowerCase()}%`) as iPluginDevQuery | null;
  if (!dev) return null;
  dev.plugins = JSON.parse(dev.plugins);
  return dev as unknown as iPluginDev;
}

export function addDev(dev: iPluginDev) {
  database
    .prepare(
      `INSERT INTO devs (id, plugins) VALUES (?1, ?2);
    `,
    )
    .run(dev.id, JSON.stringify(dev.plugins));

  return getDev(dev.id);
}

export function updateDev(dev: iPluginDev) {
  const devExists = getDev(dev.id);
  if (!devExists) return addDev({ id: dev.id, plugins: dev.plugins });
  database
    .prepare(
      `UPDATE devs SET plugins = ?2 WHERE id = ?1;
    `,
    )
    .run(dev.id, JSON.stringify(dev.plugins));
}

export function addDevPlugin(devId: string, pluginId: string) {
  const dev = getDev(devId);
  if (!dev) return addDev({ id: devId, plugins: [pluginId.toLowerCase()] });
  dev.plugins.push(pluginId.toLowerCase());
  updateDev(dev);
}

export function deleteDev(devId: string) {
  database
    .prepare(
      `DELETE FROM devs
        WHERE id = ?1;
    `,
    )
    .run(devId);
  deleteAccessToken(devId);
}

export function setAccessToken(id: string, token: string = randomToken()) {
  const oldToken = getAccessToken(id);
  if (oldToken) {
    database
      .prepare(`UPDATE accessTokens SET access_token = ?2 WHERE id = ?1;`)
      .run(id, token);
  } else {
    database
      .prepare(
        `INSERT INTO accessTokens (id, access_token) VALUES (?1, ?2);
    `,
      )
      .run(id, token);
  }
  return token;
}

export function getAccessToken(id: string) {
  return (
    database
      .query(
        `SELECT * FROM accessTokens
        WHERE id = ?1;
    `,
      )
      .get(id) as { access_token: string } | null
  )?.access_token;
}

export function deleteAccessToken(id: string) {
  database
    .prepare(
      `DELETE FROM accessTokens
        WHERE id = ?1;
    `,
    )
    .run(id);
}

export function getUserByAccessToken(token: string) {
  return (
    database
      .query(
        `SELECT * FROM accessTokens
        WHERE access_token = ?1;
    `,
      )
      .get(token) as { id: string } | null
  )?.id;
}

export function getMetadata(key: string) {
  return (
    database
      .query(
        `SELECT * FROM metadata
        WHERE key = ?1;
    `,
      )
      .get(key) as { value: string } | null
  )?.value;
}

export function setMetadata(key: string, value: string) {
  const oldMetadata = getMetadata(key);
  if (oldMetadata) {
    database
      .prepare(`UPDATE metadata SET value = ?2 WHERE key = ?1;`)
      .run(key, value);
  } else {
    database
      .prepare(
        `INSERT INTO metadata (key, value) VALUES (?1, ?2);
    `,
      )
      .run(key, value);
  }
  return value;
}
