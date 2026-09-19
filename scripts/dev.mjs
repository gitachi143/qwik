import http from "node:http";
import { randomBytes } from "node:crypto";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
process.env.QWIK_DEV = "1";
process.env.QWIK_ENCRYPTION_KEY ||= randomBytes(32).toString("hex");
const admin = process.argv.includes("--admin");
process.env.QWIK_KIND = admin ? "admin" : "product";
process.env.QWIK_PUBLIC_URL = `http://127.0.0.1:${admin ? 5174 : 5173}`;
if (admin) {
  const { passwordHash } = await import("../api/src/security.mjs");
  process.env.QWIK_ADMIN_PASSWORD_HASH = passwordHash(
    process.env.QWIK_DEV_PASSWORD || "qwik-local-development",
  );
}
const { handle } = await import("../api/src/app.mjs");
const apiServer = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 500000) {
        res.writeHead(413);
        res.end();
        return;
      }
      chunks.push(chunk);
    }
    const request = new Request(
      `http://localhost:${admin ? 5174 : 5173}${req.url}`,
      {
        method: req.method,
        headers: req.headers,
        ...(!["GET", "HEAD"].includes(req.method)
          ? { body: Buffer.concat(chunks) }
          : {}),
      },
    );
    const response = await handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  } catch (e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  }
});
apiServer.listen(admin ? 7072 : 7071, "127.0.0.1");
const vite = await createServer({
  root: "web",
  plugins: [react()],
  define: { "import.meta.env.VITE_ADMIN_MODE": JSON.stringify(String(admin)) },
  server: {
    host: "127.0.0.1",
    port: admin ? 5174 : 5173,
    strictPort: true,
    proxy: { "/api": `http://127.0.0.1:${admin ? 7072 : 7071}` },
  },
});
await vite.listen();
vite.printUrls();
