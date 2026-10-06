/**
 * Dev web build outputs for SSR on :38123 (read via public/latest-assets.json + ?v=).
 * Used by esDev watch and one-shot esBuild.js.
 */
import { writeFile } from "node:fs/promises";
import { publicPath } from "./esbuild.config.js";

const LATEST_ASSETS_PATH = "public/latest-assets.json";

export const getDevEntryAssetManifest = () => {
  const ts = Date.now();
  return {
    basePath: publicPath,
    js: `${publicPath}entry.js?v=${ts}`,
    css: `${publicPath}entry.css?v=${ts}`,
    artifactRuntimeJs: `${publicPath}artifactRuntime.js?v=${ts}`,
    artifactRuntimePreloads: [],
    timestamp: "dev",
    buildTime: new Date().toISOString(),
    buildSha: null,
  };
};

/**
 * @param {{ buildMs?: number }} [opts]
 */
export async function publishDevWebBuildSignal(opts = {}) {
  const buildMs = typeof opts.buildMs === "number" ? opts.buildMs : 0;
  const manifest = getDevEntryAssetManifest();

  await writeFile(LATEST_ASSETS_PATH, JSON.stringify(manifest, null, 2), "utf8");
  return { manifest };
}