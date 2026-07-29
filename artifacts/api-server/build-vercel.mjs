// Bundles the Express app (src/app.ts) into a single, dependency-free
// JavaScript file for Vercel's Node.js Serverless Function runtime.
//
// Why this exists: Vercel's zero-config /api builder compiles .ts files
// under /api with its own default TypeScript settings (strict
// node16/nodenext module resolution), which doesn't match this monorepo's
// tsconfig (moduleResolution: "bundler") and fails on extensionless
// relative imports plus duplicate @types/express resolution across
// workspace packages. Pre-bundling to plain JS sidesteps that entirely —
// Vercel just runs the file, no TypeScript involved.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { build as esbuild } from "esbuild";

const apiServerDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(apiServerDir, "../..");
const outDir = path.resolve(repoRoot, "api");

async function main() {
  await mkdir(outDir, { recursive: true });

  await esbuild({
    entryPoints: [path.resolve(apiServerDir, "src/app.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.resolve(outDir, "index.js"),
    logLevel: "info",
    // Same rationale as build.mjs: exclude native/unbundleable packages.
    // None of these are actual dependencies of app.ts today, but kept for
    // safety if a route ever pulls one in transitively.
    external: ["sharp", "better-sqlite3", "sqlite3", "canvas", "bcrypt", "argon2"],
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
