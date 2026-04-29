import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

const REGULATION_FILE_BY_MODALITY: Record<string, string> = {
  futsal: "LEG_Regulamento_Futsal_2026_Oficial_futsal.pdf",
  basquete: "LEG_Regulamento_Basquetebol_2026_Oficial.pdf",
  volei: "LEG_Regulament_Voleibol_2026_Oficial .pdf",
  handebol: "LEG_Regulamento_Handebol_2026_Oficial _handebol.pdf",
};

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  app.set("trust proxy", true);
  const server = createServer(app);

  // Health check endpoint — FIRST, before everything else
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  app.get("/api/regulamentos/:modality", (req, res) => {
    const modality = String(req.params.modality || "").toLowerCase();
    const fileName = REGULATION_FILE_BY_MODALITY[modality];

    if (!fileName) {
      res.status(404).json({ message: "Modalidade de regulamento não encontrada" });
      return;
    }

    const filePath = path.resolve(process.cwd(), fileName);
    res.sendFile(filePath, (err) => {
      if (!err) return;
      if (!res.headersSent) {
        res.status(404).json({ message: "Arquivo de regulamento não encontrado no servidor" });
      }
    });
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Listening on port ${port} (Production: ${process.env.NODE_ENV === "production"})`);
  });

  // Pre-warm database connection so migrations run immediately
  try {
    const { getDb } = await import("../db");
    await getDb();
    console.log("[Server] Database connection established.");
  } catch (e) {
    console.error("[Server] Database pre-warm failed (non-fatal):", e);
  }
}

startServer().catch(console.error);
