import type { ElectrobunConfig } from "electrobun";
import { resolve } from "node:path";
import { DESKTOP_APP_VERSION } from "./desktopVersion";

/**
 * Repo-root runtime dirs that must never trigger a desktop rebuild.
 *
 * IMPORTANT: electrobun's watcher matches watchIgnore globs against paths
 * RELATIVE to the project root (packages/desktop) — see shouldIgnore() in
 * electrobun's cli, which does path.relative(projectRoot, fullPath) before
 * glob matching. Absolute repo-root globs (e.g. "/repo/data/**") therefore
 * NEVER match a project-relative candidate like "../../data/x.json" and are
 * silently dead config. Repo-root dirs must be ignored via "../../<dir>/**"
 * patterns; package-local trees (packages/<pkg>/data) stay watched because
 * their candidates ("../../packages/<pkg>/data/...") don't match these.
 */
export const resolveRepoRootRuntimeWatchIgnores = (
  _repoRoot = resolve(import.meta.dir, "../..")
) =>
  ["data", "logs", "temp", "tmp", "nolo"].map((dir) => `../../${dir}/**`);

/** Trees handled by the web watcher or unrelated to the Desktop Bun process. */
export const resolveDesktopDevWatchIgnores = (
  _repoRoot = resolve(import.meta.dir, "../..")
) =>
  [
    "../../docs/**",
    "../../public/**",
    "../../packages/render/**",
    "../../packages/rn/**",
    "../../packages/ai/agent/web/**",
  ];

const hasDeveloperId = Boolean(process.env.ELECTROBUN_DEVELOPER_ID);
const hasAppleApiNotaryCreds = Boolean(
  process.env.ELECTROBUN_APPLEAPIISSUER &&
    process.env.ELECTROBUN_APPLEAPIKEY &&
    process.env.ELECTROBUN_APPLEAPIKEYPATH
);
const hasAppleIdNotaryCreds = Boolean(
  process.env.ELECTROBUN_APPLEID &&
    process.env.ELECTROBUN_APPLEIDPASS &&
    process.env.ELECTROBUN_TEAMID
);
const shouldCodesignMacRelease = hasDeveloperId;
const shouldNotarizeMacRelease =
  hasDeveloperId && (hasAppleApiNotaryCreds || hasAppleIdNotaryCreds);

export const resolveGeneratePatch = (
  platform = process.platform,
  env: {
    NOLO_DESKTOP_FORCE_PATCH?: string;
    NOLO_DESKTOP_SKIP_PATCH?: string;
    [key: string]: string | undefined;
  } = process.env
) => {
  if (env.NOLO_DESKTOP_SKIP_PATCH === "1") return false;
  if (platform === "linux") return env.NOLO_DESKTOP_FORCE_PATCH === "1";
  return true;
};

export default {
  app: {
    name: "Nolo Desktop",
    identifier: "chat.nolo.desktop",
    version: DESKTOP_APP_VERSION,
  },
  release: {
    baseUrl:
      process.env.ELECTROBUN_RELEASE_BASE_URL ??
      "https://nolo.chat/public/downloads",
    // Linux delta patches for the full CEF payload (~693MB) OOM on the one-core
    // self-hosted runner. Default off there; force with NOLO_DESKTOP_FORCE_PATCH=1.
    // Other platforms still honor NOLO_DESKTOP_SKIP_PATCH=1 to opt out.
    generatePatch: resolveGeneratePatch(),
  },
  build: {
    buildFolder: "build",
    artifactFolder: "artifacts",
    bun: {
      entrypoint: "src/bun/index.ts",
      minify: true,
      sourcemap: false, // v2 type: boolean | "inline" | "external" | "linked" ("none" was removed)
      // Desktop bundles never execute React Native upload code or server-side
      // browser automation during normal startup, so keep those optional
      // dependency trees out of Bun's desktop/server bundle graph.
      // NOTE (hutch 0.24.3): `external` / `minify` / `sourcemap` / `define` in
      // build.bun are all silently dropped from the cottontail build spec
      // (hutch-engine cottontail-build-helper passes only entryPoints/bundle/
      // platform/format/outfile/alias through). Keep them declared anyway —
      // they become effective once upstream fixes spec construction — and see
      // pre-build.ts for the chromium-bidi stub compensating for eager
      // resolution of playwright-core's bundled require("chromium-bidi/...").
      external: [
        "react-native",
        "react-native/*",
        "electron",
        "react-native-blob-util",
        "playwright",
        "playwright-core",
        "playwright-core/*",
        "chromium-bidi",
        "chromium-bidi/*",
        // classic-level loads a native .node prebuild via node-gyp-build.
        // If Bun inlines it, the generated bundle can bake in the build
        // machine's absolute node_modules path and fail after packaging.
        "classic-level",
      ],
    },
    copy: {
      ".generated/public": "public",
      // electrobun 2: copy keys/values may not escape the project root
      // (UnsafeOutputPath) and "../x" destinations are rejected outright.
      // Everything that used to come from repo-root node_modules / workspace
      // packages is staged by scripts/pre-build.ts into .generated/vendor/
      // and copied from there. Workspace packages land under integrations/
      // (→ Resources/app/integrations) and post-wrap relocates them to the
      // v1-parity location (Resources/integrations, sibling of app/).
      ".generated/vendor/node_modules/abstract-level": "node_modules/abstract-level",
      ".generated/vendor/node_modules/classic-level": "node_modules/classic-level",
      ".generated/vendor/node_modules/is-buffer": "node_modules/is-buffer",
      ".generated/vendor/node_modules/level-supports": "node_modules/level-supports",
      ".generated/vendor/node_modules/level-transcoder": "node_modules/level-transcoder",
      ".generated/vendor/node_modules/maybe-combine-errors": "node_modules/maybe-combine-errors",
      ".generated/vendor/node_modules/module-error": "node_modules/module-error",
      ".generated/vendor/node_modules/node-gyp-build": "node_modules/node-gyp-build",
      ".generated/vendor/packages/desktop-chrome-connector": "integrations/desktop-chrome-connector",
      ".generated/vendor/packages/x-reader": "integrations/x-reader",
      ".generated/vendor/packages/xhs-reader": "integrations/xhs-reader",
      // Platform-staged ripgrep (ensure-bundled-ripgrep.ts → vendor/ripgrep/staged)
      "vendor/ripgrep/staged": "bin",
    },
    watch: [
      "../../packages",
      "../../scripts",
      "../../public",
      "../../App.tsx",
      "../../index.js",
      "src",
    ],
    // Electrobun watches parent dirs of relative watch entries (e.g. ../../App.tsx
    // → repo root). Built-in ignoreDirs are relative to packages/desktop only, so
    // ignore repo-root .git / node_modules / runtime dir churn that would otherwise
    // rebuild-storm. Runtime/dev-ignore globs are PROJECT-RELATIVE ("../../x/**")
    // because electrobun matches watchIgnore against path.relative(projectRoot,
    // fullPath) — absolute globs never match and are dead config.
    watchIgnore: [
      // pre-build re-stages vendor deps into .generated/ on every build;
      // watching that tree loops build → write → rebuild (dev --watch storm).
      ".generated/**",
      "**/.git/**",
      "**/node_modules/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.tsbuildinfo",
      "**/*.log",
      ...resolveRepoRootRuntimeWatchIgnores(),
      ...resolveDesktopDevWatchIgnores(),
    ],
    mac: {
      bundleCEF: false,
      codesign: shouldCodesignMacRelease,
      createDmg:
        process.env.NOLO_DESKTOP_SKIP_DMG !== "1" &&
        process.env.NOLO_DESKTOP_BRANDED_DMG === "0",
      defaultRenderer: "native",
      notarize: shouldNotarizeMacRelease,
      // v2 default resolves "icon.iconset" against the project root; the repo
      // keeps the iconset under assets/ (hutch warns when it is missing —
      // post-wrap still injects AppIcon.icns as a fallback, but declare the
      // real source so DMG/app icons come from the iconset directly).
      icons: "assets/icon.iconset",
    },
    linux: {
      bundleCEF: true,
      defaultRenderer: "cef",
      icon: "assets/icon.png",
    },
    win: {
      // The public installer provisions WebView2 before first launch. Keeping
      // the native renderer avoids shipping a multi-GB CEF payload while still
      // preventing end users from manually fixing runtime prerequisites.
      bundleCEF: false,
      defaultRenderer: "native",
      icon: "assets/icon.ico",
    },
  },
  scripts: {
    preBuild: "./scripts/pre-build.ts",
    postWrap: "./scripts/post-wrap.ts",
    postPackage: "./scripts/post-package.ts",
  },
} satisfies ElectrobunConfig;
