#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "ios/Vyveska/www");
const staticDir = join(root, ".vercel/output/static");
const port = 4173;
const origin = `http://127.0.0.1:${port}/`;

if (!existsSync(staticDir)) {
  throw new Error("Missing .vercel/output/static — run npm run build first");
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(staticDir, dest, { recursive: true });

const child = spawn(
  process.execPath,
  [join(root, "scripts/with-app-env.mjs"), "vite", "preview", "--host", "127.0.0.1", "--port", String(port)],
  { cwd: root, stdio: "pipe" },
);

async function waitReady() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(origin);
      if (res.ok) return res;
    } catch {
      /* still booting */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("vite preview did not become ready");
}

try {
  const res = await waitReady();
  const html = await res.text();
  writeFileSync(join(dest, "index.html"), html);
  console.log("[ios-web-export] wrote", dest);
} finally {
  child.kill("SIGTERM");
}
