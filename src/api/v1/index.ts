import { randomUUID } from "crypto";
import { Router } from "express";

import { CurrentGenesisVersions } from "../..";
import { deleteUser, getPlugin, getUser, updateUser } from "../../sql";
import { pluginsRouter } from "./plugins";

const router = Router();

export interface updateRequest {
  uuid: string;
  version: string;
  plugins: {
    [pluginName: string]: {
      version: number;
      enabled: boolean;
      proxied: boolean;
    };
  };
}
export interface updateResponse {
  uuid: string;
  updateAvailable: boolean;
  disabledPlugins: string[];
  deletedPlugins: string[];
  pluginUpdates: Record<string, string>;
}

router.post("/update", (req, res) => {
  const body = req.body as updateRequest;
  let uuid = body.uuid;
  if (uuid === "") {
    while (true) {
      const newUuid = randomUUID();
      if (!getUser(newUuid)) {
        uuid = newUuid;
        break;
      }
    }
  }

  const userPlugins = Object.keys(body.plugins);

  // bump the user's last ping
  updateUser(uuid, Date.now(), body.version, userPlugins);

  const disabledPlugins: string[] = [];
  const deletedPlugins: string[] = [];
  const pluginUpdates: Record<string, string> = {};
  let updateAvailable = false;

  for (const pluginId in body.plugins) {
    if (!body.plugins[pluginId].proxied) continue;
    const plugin = getPlugin(pluginId);
    if (!plugin) {
      deletedPlugins.push(pluginId);
      continue;
    }
    if (plugin.disabled) {
      disabledPlugins.push(pluginId);
    }
    if (!body.plugins[pluginId].enabled) continue; // don't check for updates if the plugin is disabled
    if (plugin.versionCode > body.plugins[pluginId].version) {
      pluginUpdates[pluginId] = plugin.version;
    }
  }

  let currentVer = CurrentGenesisVersions.release;

  if (body.version.endsWith("b")) currentVer = CurrentGenesisVersions.dev;

  if (body.version !== currentVer) {
    updateAvailable = true;
  }

  const response: updateResponse = {
    uuid,
    updateAvailable,
    disabledPlugins,
    deletedPlugins,
    pluginUpdates,
  };
  res.json(response);
});

export interface deleteUserRequest {
  uuid: string;
}
router.post("/delete", (req, res) => {
  const uuid = (req.body as deleteUserRequest).uuid;
  if (uuid) {
    deleteUser(uuid);
  }
  res.json({});
});

router.use("/plugins", pluginsRouter);

export const v1Router = router;
