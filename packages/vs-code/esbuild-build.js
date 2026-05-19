import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

if (!watch && fs.existsSync("dist")) {
  fs.rmSync("dist", { recursive: true, force: true });
}

const extensionPackage = JSON.parse(
  fs.readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
);

/**
 * Problem matcher plugin
 * @type {import("esbuild").Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",
  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });

    build.onEnd((result) => {
      for (const { text, location } of result.errors) {
        console.error(`✘ [ERROR] ${text}`);

        if (location) {
          console.error(
            `    ${location.file}:${location.line}:${location.column}`,
          );
        }
      }

      console.log("[watch] build finished");
    });
  },
};

/**
 * Replace node-specific resolver with browser-safe resolver
 * @type {import("esbuild").Plugin}
 */
const browserAliasPlugin = {
  name: "browser-alias",

  setup(build) {
    build.onResolve({ filter: /\.\/ModuleResolverNode(\.js)?$/ }, (args) => {
      return {
        path: path.join(args.resolveDir, "ModuleResolverWeb.ts"),
      };
    });
  },
};

/**
 * Browser shims for Node built-ins
 * @type {import("esbuild").Plugin}
 */
const browserShimsPlugin = {
  name: "browser-shims",

  setup(build) {
    const shimmed = ["fs", "os", "url", "module", "path"];

    for (const mod of shimmed) {
      build.onResolve({ filter: new RegExp(`^${mod}$`) }, () => ({
        path: mod,
        namespace: "browser-shim",
      }));
    }

    build.onLoad({ filter: /.*/, namespace: "browser-shim" }, async (args) => {
      switch (args.path) {
        case "os":
          return {
            contents: `
      export function homedir() {
        return "/";
      }

      export function platform() {
        return "browser";
      }

      export function tmpdir() {
        return "/tmp";
      }

      export function arch() {
        return "x64";
      }

      export default {
        homedir,
        platform,
        tmpdir,
        arch
      };
    `,
            loader: "js",
          };

        case "fs":
          return {
            contents: `
                export const promises = {
                  access: async () => {
                    throw new Error("fs not available in browser");
                  },

                  readFile: async () => {
                    throw new Error("fs not available in browser");
                  },

                  writeFile: async () => {
                    throw new Error("fs not available in browser");
                  },

                  readdir: async () => {
                    return [];
                  },
                };

                export function readFileSync() {
                  throw new Error("fs not available in browser");
                }

                export default {
                  promises,
                  readFileSync,
                };
              `,
            loader: "js",
          };

        case "url":
          return {
            contents: `
                export function pathToFileURL(p) {
                  return new URL("file://" + p);
                }
              `,
            loader: "js",
          };

        case "module":
          return {
            contents: `
                export function createRequire() {
                  return {
                    resolve() {
                      throw new Error("createRequire unavailable in browser");
                    }
                  };
                }
              `,
            loader: "js",
          };

        case "path":
          return {
            contents: `
                export function join(...parts) {
                  return parts.join("/");
                }

                export function dirname(p) {
                  return p.split("/").slice(0, -1).join("/");
                }

                export default {
                  join,
                  dirname
                };
              `,
            loader: "js",
          };
      }
    });
  },
};

const sharedConfig = {
  entryPoints: ["src/extension.ts"],

  bundle: true,

  minify: production,

  sourcemap: !production,

  sourcesContent: false,

  external: ["vscode"],

  define: {
    global: "globalThis",

    "process.env.EXTENSION_NAME": JSON.stringify(
      `${extensionPackage.publisher}.${extensionPackage.name}`,
    ),

    "process.env.EXTENSION_VERSION": JSON.stringify(extensionPackage.version),
  },

  logLevel: "silent",
};

/**
 * Desktop/node extension build
 * @type {import("esbuild").BuildOptions}
 */
const nodeConfig = {
  ...sharedConfig,

  platform: "node",

  format: "esm",

  target: ["node20"],

  outfile: "dist/extension.js",

  plugins: [esbuildProblemMatcherPlugin],
};

/**
 * Browser/web extension build
 * @type {import("esbuild").BuildOptions}
 */
const browserConfig = {
  ...sharedConfig,
  entryPoints: ["src/extension.web.ts"],

  platform: "browser",

  format: "cjs",

  target: ["es2020"],

  outfile: "dist/web/extension.js",

  alias: {
    path: "path-browserify",
  },

  banner: {
    js: `
      var process = {
        env: {
          EXTENSION_NAME: "${extensionPackage.publisher}.${extensionPackage.name}",
          EXTENSION_VERSION: "${extensionPackage.version}",
          BROWSER_ENV: "true"
        },

        platform: "browser",

        cwd: function () {
          return "/";
        },

        nextTick: function (cb) {
          setTimeout(cb, 0);
        }
      };
    `,
  },

  plugins: [
    browserAliasPlugin,
    browserShimsPlugin,
    esbuildProblemMatcherPlugin,
  ],
};

async function main() {
  const nodeCtx = await esbuild.context(nodeConfig);

  const browserCtx = await esbuild.context(browserConfig);

  if (watch) {
    await Promise.all([nodeCtx.watch(), browserCtx.watch()]);

    return;
  }

  await Promise.all([nodeCtx.rebuild(), browserCtx.rebuild()]);

  await Promise.all([nodeCtx.dispose(), browserCtx.dispose()]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
