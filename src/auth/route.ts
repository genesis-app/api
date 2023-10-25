import { Router } from "express";

import { ADMIN_IDS } from "..";
import { getDev, setAccessToken } from "../sql";
import { AuthenticatedRequest, devAuthentication } from "./middleware";

const router = Router();

const DISCORD_CLIENT_ID = Bun.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = Bun.env.DISCORD_CLIENT_SECRET!;
const DISCORD_CALLBACK = Bun.env.DISCORD_CALLBACK!;
const UI_CALLBACK = Bun.env.UI_CALLBACK!;
const AUTH_URL = `https://discord.com/api/oauth2/authorize?response_type=token&client_id=${DISCORD_CLIENT_ID}&redirect_uri=${DISCORD_CALLBACK}&response_type=code&scope=identify`;

router.get("/", (req, res) => {
  res.redirect(AUTH_URL);
});
router.get("/callback", async (req, res) => {
  const code = req.query.code?.toString();
  if (!code) return res.status(400).json({ error: "No code provided" });

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: DISCORD_CALLBACK,
      scope: "identify",
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const json = (await response.json()) as { access_token: string };
  const token = json.access_token;

  const user = await fetch("https://discord.com/api/users/@me", {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const userId = (
    (await user.json()) as {
      id: string;
    }
  ).id;

  const dev = getDev(userId);
  if (!dev && !ADMIN_IDS.includes(userId))
    return res.status(403).json({ error: "Not a dev" });

  const accessToken = setAccessToken(userId);

  res.redirect(`${UI_CALLBACK}?accessToken=${accessToken}`);
});

router.use("/user", devAuthentication);
router.get("/user", (req: AuthenticatedRequest, res) => {
  res.json({
    userId: req.userId,
    isDev: req.isDev,
    isAdmin: req.isAdmin,
  });
});

export const authRouter = router;
