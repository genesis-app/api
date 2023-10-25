import { NextFunction, Request, Response } from "express";

import { ADMIN_IDS } from "..";
import { getDev, getUserByAccessToken } from "../sql";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  isDev?: boolean;
  isAdmin?: boolean;
}

function getAuth(req: AuthenticatedRequest, res: Response): boolean {
  const accessToken =
    req.headers.authorization || req.query.accessToken?.toString();
  if (!accessToken) {
    res.status(400).json({ error: "No access token provided" });
    return false;
  }

  const user = getUserByAccessToken(accessToken);
  if (!user) {
    res.status(400).json({ error: "Invalid access token" });
    return false;
  }
  const dev = getDev(user);
  if (!dev) req.isDev = false;
  else req.isDev = true;
  if (ADMIN_IDS.includes(user)) req.isAdmin = true;
  else req.isAdmin = false;

  req.userId = user;

  return true;
}

export const devAuthentication = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!getAuth(req, res)) return; // getAuth will handle the response

  if (!req.isDev && !req.isAdmin)
    return res.status(403).json({ error: "Not a dev" });

  next();
};

export const adminAuthentication = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!getAuth(req, res)) return; // getAuth will handle the response

  if (!req.isAdmin) return res.status(403).json({ error: "Not a dev" });

  next();
};
