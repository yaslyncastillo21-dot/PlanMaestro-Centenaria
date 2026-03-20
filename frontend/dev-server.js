const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function resolveFilePath(requestPath) {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0]);
  const normalized = path.normalize(cleanPath).replace(/^(\.\.[\\/])+/, "");
  const candidate = normalized === "/" ? "/index.html" : normalized;
  return path.join(ROOT_DIR, candidate);
}

const server = http.createServer((req, res) => {
  const filePath = resolveFilePath(req.url || "/");

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const fallback = path.join(ROOT_DIR, "index.html");
    fs.readFile(fallback, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(content);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Frontend running at http://${HOST}:${PORT}`);
});
