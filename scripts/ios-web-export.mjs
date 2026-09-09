#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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

function writeFallbackHtml() {
  const assets = readdirSync(join(staticDir, "assets"));
  const css = assets.find((f) => f.startsWith("styles-") && f.endsWith(".css"));
  const js = assets.find((f) => f.startsWith("index-") && f.endsWith(".js"));
  if (!css || !js) throw new Error("built assets not found");
  const html = `<!DOCTYPE html>
<html lang="ru" class="antialiased">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no" />
  <title>Вывеска</title>
  <meta name="theme-color" content="#ebe7e0" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="stylesheet" href="/assets/${css}" />
</head>
<body class="overscroll-none bg-bg text-fg">
  <script type="module" src="/assets/${js}"></script>
</body>
</html>
`;
  writeFileSync(join(dest, "index.html"), html);
  console.log("[ios-web-export] wrote fallback index.html");
}

const bin = join(root, "node_modules/.bin");
const child = spawn("vite", ["preview", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ""}` },
});

async function waitReady() {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(origin);
      if (res.ok) return res;
    } catch {
      /* still booting */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

try {
  const res = await waitReady();
  if (res) {
    writeFileSync(join(dest, "index.html"), await res.text());
    console.log("[ios-web-export] captured preview HTML");
  } else {
    console.warn("[ios-web-export] preview not ready, using fallback HTML");
    writeFallbackHtml();
  }
} finally {
  child.kill("SIGTERM");
}
