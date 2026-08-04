// Dependency-free static file server for the LoveHub Games hub.
// Binds to 0.0.0.0 so it works in managed/preview environments.
// Port comes from process.env.PORT (injected by the platform) with a local fallback.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://localhost");
    let urlPath = decodeURIComponent(pathname);
    if (urlPath === "/") urlPath = "/index.html";

    // Resolve and guard against path traversal outside the project root.
    const filePath = resolve(ROOT, "." + urlPath);
    if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("403 Forbidden");
      return;
    }

    try {
      const info = await stat(filePath);
      const target = info.isDirectory() ? join(filePath, "index.html") : filePath;
      const data = await readFile(target);
      res.writeHead(200, {
        "Content-Type": MIME[extname(target)] ?? "application/octet-stream",
      });
      res.end(data);
    } catch {
      // SPA-style fallback: serve the root hub page for unknown routes.
      const fallback = await readFile(join(ROOT, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fallback);
    }
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("500 Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`LoveHub Games server running at http://${HOST}:${PORT}`);
});
