import { ADMIN_IDS } from "../src";
import { iPlugin } from "../src/sql";
export const testPlugin: iPlugin = {
  name: "testPlugin",
  id: "xyz.genesisapp.testPlugin",
  version: "0.0.1",
  versionCode: 1,
  builtin: true,
  builtinVersion: 1,
  description: "A test plugin",
  author: ADMIN_IDS[0],
  disabled: false,
  extension: "jar",
  users: 0,
};

export const testPlugin2: iPlugin = {
  name: "testPlugin2",
  id: "xyz.genesisapp.testPlugin2",
  version: "0.0.1",
  versionCode: 1,
  builtin: true,
  builtinVersion: 1,
  description: "Another test plugin",
  author: ADMIN_IDS[0],
  disabled: false,
  extension: "jar",
  users: 0,
};
