import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

// The API surface only — body parsing, the (dormant-unless-configured) OAuth callback route,
// and tRPC. Shared by both the traditional long-running server (server/_core/index.ts, used
// for local dev and any host that runs a persistent Node process) and the Vercel serverless
// function (api/[...path].ts). Static asset / SPA serving is deliberately NOT here: locally
// it's handled by Vite's own dev/prod middleware in server/_core/vite.ts, and on Vercel it's
// handled natively by Vercel's static hosting plus the SPA rewrite in vercel.json — this
// function never needs to know about either, and never calls .listen() itself.
export function createApiApp(): Express {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
