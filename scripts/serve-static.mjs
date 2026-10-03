import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve("out");
const port = Number(process.env.PORT ?? 3000);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
await stat(root); // Require a successful static build before starting.
createServer(async (request, response) => {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    const url = new URL(request.url ?? "/", "http://localhost");
    let path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    let info = await stat(path).catch(() => null);
    if (info?.isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        response.writeHead(308, { Location: `${url.pathname}/${url.search}` }).end();
        return;
      }
      path = resolve(path, "index.html");
      info = await stat(path).catch(() => null);
    }
    const status = info?.isFile() ? 200 : 404;
    if (status === 404) path = resolve(root, "404.html");
    const data = await readFile(path);
    response.writeHead(status, { "Content-Type": types[extname(path)] ?? "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : data);
  } catch {
    response.writeHead(400).end("Unable to read this request.");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`DevFix AI static preview: http://localhost:${port}`);
});
