import { build } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir, copyFile, writeFile, readdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
await copyFile("cli/lib/scanner.mjs", "api/src/scanner.mjs");
const config = {
  navigationFallback: {
    rewrite: "/index.html",
    exclude: [
      "/api/*",
      "/.auth/*",
      "/assets/*",
      "/downloads/*",
      "/favicon.svg",
    ],
  },
  platform: { apiRuntime: "node:22" },
  globalHeaders: {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  },
  routes: [
    { route: "/api/*", headers: { "Cache-Control": "no-store" } },
    { route: "/index.html", headers: { "Cache-Control": "no-cache" } },
    { route: "/downloads/*", headers: { "Cache-Control": "no-cache" } },
  ],
};
for (const admin of [false, true]) {
  const dir = admin ? "dist-admin" : "dist";
  await build({
    root: resolve("web"),
    plugins: [react()],
    define: {
      "import.meta.env.VITE_ADMIN_MODE": JSON.stringify(String(admin)),
    },
    build: { outDir: resolve(dir), emptyOutDir: true },
  });
  await writeFile(
    `${dir}/staticwebapp.config.json`,
    JSON.stringify(config, null, 2),
  );
}
await mkdir("dist/downloads", { recursive: true });
const packed = JSON.parse(
  execFileSync(
    "npm",
    ["pack", "--json", "--pack-destination", resolve("dist/downloads")],
    { cwd: "cli", encoding: "utf8" },
  ),
);
await copyFile(
  `dist/downloads/${packed[0].filename}`,
  "dist/downloads/qwik-cli.tgz",
);
await rm(`dist/downloads/${packed[0].filename}`);
console.log("Built product, admin, API scanner, and downloadable CLI.");
