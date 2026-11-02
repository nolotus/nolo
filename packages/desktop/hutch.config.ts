// @hutch cli=0.28.1 cottontail=0.7.2
/**
 * Hutch configuration for the Nolo Desktop electrobun 2 toolchain.
 *
 * `electrobun.version` pins the exact Electrobun devkit/runtime release that
 * Hutch projects into `.hutch/devkit` (and downloads into the shared
 * `~/.hutch/releases/electrobun` store). Pinning is required for hermetic
 * CI builds: without it Hutch floats on the `canary` release channel and
 * needs network access to resolve the latest release on every `sync`/`build`.
 *
 * The `@hutch` pragma pins the paired Hutch CLI (0.28.1) and Cottontail
 * (0.7.2) toolchain that Electrobun 2.0.4 ships with. The npm `electrobun`
 * dependency and this devkit pin must move together: the npm package version
 * decides which Hutch release the bootstrap downloads, while
 * `electrobun.version` decides which devkit Hutch projects.
 *
 * `packageManager: "bun"` selects Bun as the external package manager for
 * Hutch's resolver (its built-in resolver does not support workspaces yet).
 *
 * v1→v2 note: keys like `build.bunVersion` / `build.bunnyBun` were removed
 * from electrobun.config.ts in v2 — this file is what pins the toolchain now.
 */
export default {
  packageManager: "bun",
  electrobun: {
    version: "2.0.4",
  },
};
