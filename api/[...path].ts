import "dotenv/config";
import { createApiApp } from "../server/_core/app";

// Vercel serverless entrypoint (Node.js runtime, not Edge — the Postgres driver and jose need
// real TCP sockets). The `[...path]` catch-all filename maps every request under /api/* to
// this one function via Vercel's filesystem routing, and its Node builder knows how to invoke
// an exported Express app directly per-request (an Express app is itself a valid
// `(req, res) => void` handler) — there is no app.listen() here; Vercel owns the
// request/response lifecycle entirely.
export default createApiApp();
