import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // Rota de Login Mestre para a Equipe LEG
  // Para entrar, basta acessar: /api/auth/master?code=SUA_SENHA
  app.get("/api/auth/master", async (req: Request, res: Response) => {
    const code = req.query.code;
    const MASTER_CODE = process.env.AUTH_SECRET || "LEG2026"; 

    if (code !== MASTER_CODE) {
      return res.status(401).send("Código Administrativo Inválido. Use /api/auth/master?code=SENHA");
    }

    const adminUser = {
      openId: "admin-master",
      name: "Administrador LEG",
      email: "admin@ligaleg.com.br",
      loginMethod: "master",
      lastSignedIn: new Date(),
    };

    try {
      await db.upsertUser(adminUser);

      const sessionToken = await sdk.createSessionToken(adminUser.openId, {
        name: adminUser.name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      
      return res.redirect("/");
    } catch (error) {
      console.error("[Auth] Master login failed", error);
      res.status(500).send("Erro no login mestre");
    }
  });
}
