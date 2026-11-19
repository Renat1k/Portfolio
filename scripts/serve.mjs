import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)), option("--dir", "."));
const port = Number(option("--port", process.env.PORT || "8080"));
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".glb":"model/gltf-binary", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8" };

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let target = path.resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    const info = await stat(target);
    if (info.isDirectory()) {
      if (!pathname.endsWith("/")) {
        response.writeHead(301, { Location: `${pathname}/${new URL(request.url, "http://localhost").search}` }).end();
        return;
      }
      target = path.join(target, "index.html");
    }
    const body = await readFile(target);
    response.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    const locale = /^\/(en|uk)(?:\/|$)/.exec(request.url)?.[1] || '';
    const body = await readFile(path.join(root, locale, "404.html")).catch(() => "Not found");
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }).end(body);
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Portfolio: http://127.0.0.1:${server.address().port} (${root})`));
