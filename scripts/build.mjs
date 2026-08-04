// Static-site build: produce a self-contained dist/ directory that
// the hosting builder can serve. Copies index.html and (if present)
// the games/ assets folder.
import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

await mkdir(DIST, { recursive: true });
await cp(join(ROOT, "index.html"), join(DIST, "index.html"));

if (existsSync(join(ROOT, "games"))) {
  await cp(join(ROOT, "games"), join(DIST, "games"), { recursive: true });
}

// GitHub Pages compatibility: prevent Jekyll processing (files starting with _
// would otherwise be ignored) for both repo-root and dist/ deployments.
await cp(join(ROOT, ".nojekyll"), join(DIST, ".nojekyll"));

console.log("Build complete: dist/ is ready to serve.");
