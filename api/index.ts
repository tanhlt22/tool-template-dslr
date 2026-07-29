// Vercel Serverless Function entry point.
//
// Vercel auto-detects any file under /api as a serverless function. This
// file re-exports the same Express app used by the Replit `api-server`
// artifact (artifacts/api-server/src/app.ts) so both environments run the
// exact same routes/behavior — no logic is duplicated.
//
// Express apps are valid (req, res) => void handlers, which is exactly the
// signature Vercel's Node.js runtime expects, so no adapter is needed.
import app from "../artifacts/api-server/src/app";

export default app;
