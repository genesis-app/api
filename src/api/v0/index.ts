import { Router } from "express";

import { getRelease } from "../../utils";

const router = Router();

router.use((req, res, next) => {
  if (req.headers.authorization !== Bun.env.PRESHARED_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();

  router.post("/release", (req, res) => {
    getRelease();
    res.json({});
  });
});

export const v0Router = router;
