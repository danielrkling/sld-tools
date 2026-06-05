// scripts/sync-ts-plugin.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function syncPackage(name) {
  const source = path.resolve(__dirname, "..", name);
  const target = path.resolve(
    __dirname,
    "node_modules/@tagged-jsx",
    name,
  );

  fs.mkdirSync(target, { recursive: true });

  fs.copyFileSync(
    path.join(source, "package.json"),
    path.join(target, "package.json"),
  );

  const distTarget = path.join(target, "dist");
  fs.rmSync(distTarget, { recursive: true, force: true });
  fs.cpSync(path.join(source, "dist"), distTarget, { recursive: true });

  console.log(`Synced ${name}`);
}

syncPackage("parse");
syncPackage("transform");
syncPackage("ts-plugin");