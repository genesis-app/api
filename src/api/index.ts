import { Router } from "express";

import { v0Router } from "./v0";
import { v1Router } from "./v1";

const router = Router();

router.use("/v0", v0Router);
router.use("/v1", v1Router);

export const apiRouter = router;
