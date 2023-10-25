import { Router } from "express";

import { getPlugin, getPlugins } from "../../../sql";
import { adminRouter } from "./admin";
import { devRouter } from "./dev";

const router = Router();

router.get("/", (req, res) => {
  const plugins = getPlugins().filter((plugin) => !plugin.builtin);
  res.json(plugins);
});

router.get("/plugin/:pluginId", (req, res) => {
  const pluginId = req.params.pluginId;

  const plugin = getPlugin(pluginId);
  if (!plugin) return res.status(404).json({ error: "Plugin not found" });

  res.json(plugin);
});

router.get("/plugin/:pluginId/download", (req, res) => {
  const pluginId = req.params.pluginId.toLowerCase();

  const plugin = getPlugin(pluginId);
  if (!plugin) return res.status(404).json({ error: "Plugin not found" });

  res.sendFile(`/plugins/${pluginId}/${plugin.versionCode}.jar`, {
    root: "./",
  });
});

router.get("/plugin/:pluginId/download/:versionCode", (req, res) => {
  const pluginId = req.params.pluginId.toLowerCase();

  const plugin = getPlugin(pluginId);
  if (!plugin) return res.status(404).json({ error: "Plugin not found" });

  res.sendFile(`/plugins/${pluginId}/${req.params.versionCode}.jar`, {
    root: "./",
  });
});

router.get("/devs/:devId", (req, res) => {
  const devId = req.params.devId;

  const dev = getPlugin(devId);
  if (!dev) return res.status(404).json({ error: "Dev not found" });

  res.json(dev);
});

router.use("/dev", devRouter);
router.use("/admin", adminRouter);

export const pluginsRouter = router;
