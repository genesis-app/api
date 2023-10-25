import { Router } from "express";
import { rename, rm } from "fs/promises";
import multer from "multer";

import {
  AuthenticatedRequest,
  devAuthentication,
} from "../../../auth/middleware";
import {
  deletePlugin,
  getDev,
  getPlugin,
  getPluginsByDev,
  iPlugin,
  iPluginDev,
  updatePlugin,
} from "../../../sql";

const router = Router();
const upload = multer({ dest: "uploadtemp/" });

router.use(devAuthentication);

interface BaseDevResponse {
  dev: iPluginDev | null;
  plugins: Record<string, iPlugin>;
}

router.get("/", (req: AuthenticatedRequest, res) => {
  const response: BaseDevResponse = {
    dev: getDev(req.userId!),
    plugins: getPluginsByDev(req.userId!).reduce((acc, plugin) => {
      acc[plugin.id] = plugin;
      return acc;
    }, {}),
  };
  res.json(response);
});

router.post("/:id/edit", upload.none(), (req: AuthenticatedRequest, res) => {
  const plugin = getPlugin(req.params.id);
  if (!plugin) return res.status(404).json({ error: "Plugin not found" });
  if (plugin.author !== req.userId && !req.isAdmin)
    return res.status(403).json({ error: "Not your plugin" });

  const updatedPlugin = req.body as Partial<iPlugin>;
  console.log(updatedPlugin);
  if (!req.isAdmin) {
    // admins can edit anything
    if (updatedPlugin.id) delete updatedPlugin.id;
    if (updatedPlugin.version) delete updatedPlugin.version;
    if (updatedPlugin.versionCode) delete updatedPlugin.versionCode;
    if (updatedPlugin.extension) delete updatedPlugin.extension;
  }

  res.json(updatePlugin(req.params.id, updatedPlugin));
});

interface pluginUpdateRequest {
  version: string;
  versionCode: number;
}
router.post(
  "/:id/update",
  upload.single("plugin"),
  async (req: AuthenticatedRequest, res) => {
    const plugin = getPlugin(req.params.id);
    if (!req.file)
      return res.status(400).json({ error: "Missing plugin file" });
    if (!plugin) {
      res.status(404).json({ error: "Plugin not found" });
      await rm(`uploadtemp/${req.file.filename}`);
      return;
    }
    if (plugin.author !== req.userId && !req.isAdmin) {
      res.status(403).json({ error: "Not your plugin" });
      await rm(`uploadtemp/${req.file.filename}`);
      return;
    }

    const body = req.body as pluginUpdateRequest;
    if (!body.version || !body.versionCode) {
      res.status(400).json({ error: "Missing version or versionCode" });
      await rm(`uploadtemp/${req.file.filename}`);
      return;
    }
    if (body.versionCode <= plugin.versionCode) {
      res.status(400).json({
        error: "VersionCode must be greater than current versionCode",
      });
      await rm(`uploadtemp/${req.file.filename}`);
      return;
    }

    const ext = req.file.originalname.split(".").pop();

    // move the file from uploadtemp to plugins
    await rename(
      `uploadtemp/${req.file.filename}`,
      `plugins/${plugin.id}/${body.versionCode}.${ext}`,
    );
    updatePlugin(plugin.id, {
      version: body.version,
      versionCode: body.versionCode,
      extension: ext,
    });

    res.json({ success: true });
  },
);

router.post("/:id/delete", async (req: AuthenticatedRequest, res) => {
  const plugin = getPlugin(req.params.id);
  if (!plugin) return res.status(404).json({ error: "Plugin not found" });
  if (plugin.author !== req.userId && !req.isAdmin)
    return res.status(403).json({ error: "Not your plugin" });

  deletePlugin(req.params.id);

  await rm(`plugins/${plugin.id}`, { recursive: true });

  res.json({ success: true });
});

router.post("/:id/disable", (req: AuthenticatedRequest, res) => {
  const plugin = getPlugin(req.params.id);
  if (!plugin) return res.status(404).json({ error: "Plugin not found" });
  if (plugin.author !== req.userId && !req.isAdmin)
    return res.status(403).json({ error: "Not your plugin" });

  updatePlugin(req.params.id, { disabled: true });

  res.json({ success: true });
});
router.post("/:id/enable", (req: AuthenticatedRequest, res) => {
  const plugin = getPlugin(req.params.id);
  if (!plugin) return res.status(404).json({ error: "Plugin not found" });
  if (plugin.author !== req.userId && !req.isAdmin)
    return res.status(403).json({ error: "Not your plugin" });

  updatePlugin(req.params.id, { disabled: false });

  res.json({ success: true });
});

router.post("/delete", (req: AuthenticatedRequest, res) => {
  const plugin = getPlugin(req.body.id);
  if (!plugin) return res.status(404).json({ error: "Plugin not found" });
  if (plugin.author !== req.userId && !req.isAdmin)
    return res.status(403).json({ error: "Not your plugin" });

  deletePlugin(req.body.id);

  res.json({ success: true });
});

export const devRouter = router;
