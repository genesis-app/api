import { Router } from "express";
import { exists, mkdir, rename, rm } from "fs/promises";
import multer from "multer";

import {
  adminAuthentication,
  AuthenticatedRequest,
} from "../../../auth/middleware";
import { addPlugin, getPlugin, iPlugin } from "../../../sql";

const router = Router();
const upload = multer({ dest: "uploadtemp/" });

router.use(adminAuthentication);

router.post(
  "/upload",
  upload.single("plugin"),
  async (req: AuthenticatedRequest, res) => {
    const body = req.body as Omit<iPlugin, "extension">;
    const oldPlugin = getPlugin(body.id);
    if (!req.file)
      return res.status(400).json({ error: "Missing plugin file" });
    if (oldPlugin) {
      res.status(404).json({ error: "Plugin exists" });
      await rm(`uploadtemp/${req.file.filename}`);
      return;
    }

    if (!(await exists(`plugins/${body.id}`)))
      await mkdir(`plugins/${body.id}`);

    const ext = req.file.originalname.split(".").pop();

    // move the file from uploadtemp to plugins
    await rename(
      `uploadtemp/${req.file.filename}`,
      `plugins/${body.id}/${body.versionCode}.${ext}`,
    );

    const plugin = {
      ...body,
      extension: ext,
    } as iPlugin;

    addPlugin(plugin);

    res.json(body);
  },
);

export const adminRouter = router;
