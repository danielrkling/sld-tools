// scripts/sync-ts-plugin.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(__dirname, "..", "ts-plugin");
const target = path.resolve(
  __dirname,
  "node_modules/@tagged-jsx/ts-plugin",
);

fs.mkdirSync(target, { recursive: true });

fs.copyFileSync(
  path.join(source, "package.json"),
  path.join(target, "package.json"),
);

fs.rmSync(
  path.join(target, "dist"),
  {
    recursive: true,
    force: true,
  },
);

fs.cpSync(
  path.join(source, "dist"),
  path.join(target, "dist"),
  {
    recursive: true,
  },
);

console.log("Synced ts-plugin");