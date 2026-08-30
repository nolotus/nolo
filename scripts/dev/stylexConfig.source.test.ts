import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const esbuildConfigPath = join(import.meta.dir, "esbuild.config.js");
const buildRenderBundlePath = join(import.meta.dir, "buildRenderBundle.ts");
const stylexBunTestPluginPath = join(import.meta.dir, "../test/stylexBunTestPlugin.ts");

const esbuildConfigSource = readFileSync(esbuildConfigPath, "utf8");
const buildRenderBundleSource = readFileSync(buildRenderBundlePath, "utf8");
const stylexBunTestPluginSource = readFileSync(stylexBunTestPluginPath, "utf8");

type StylexConfig = {
  useCSSLayers?: boolean;
  importSources?: string[];
  unstable_moduleResolution?: { type: string };
  [key: string]: unknown;
};

function parseObjectLiteral(codeBlock: string): StylexConfig {
  return new Function(`return (${codeBlock.trim()});`)() as StylexConfig;
}

function extractBalancedBraces(source: string, startIndex: number): string {
  let depth = 0;
  let start = -1;
  for (let i = startIndex; i < source.length; i++) {
    const char = source[i];
    if (char === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  throw new Error("Unmatched braces in source block");
}

function extractEsbuildConfigStylexOptions(source: string): StylexConfig {
  const marker = "stylexUnplugin.esbuild(";
  const idx = source.indexOf(marker);
  if (idx === -1) {
    throw new Error("Could not find stylexUnplugin.esbuild in esbuild.config.js");
  }
  const block = extractBalancedBraces(source, idx + marker.length);
  return parseObjectLiteral(block);
}

function extractEsbuildConfigCollectInstanceOptions(source: string): StylexConfig {
  const marker = "stylexCollectInstance = unpluginFactory(";
  const idx = source.indexOf(marker);
  if (idx === -1) {
    throw new Error("Could not find stylexCollectInstance = unpluginFactory in esbuild.config.js");
  }
  const block = extractBalancedBraces(source, idx + marker.length);
  return parseObjectLiteral(block);
}

function extractBuildRenderBundleStylexOptions(source: string): StylexConfig {
  const fnMarker = "function createStylexPlugin";
  const fnIdx = source.indexOf(fnMarker);
  if (fnIdx === -1) {
    throw new Error("Could not find createStylexPlugin function in buildRenderBundle.ts");
  }
  const marker = "stylexUnplugin.esbuild(";
  const idx = source.indexOf(marker, fnIdx);
  if (idx === -1) {
    throw new Error("Could not find stylexUnplugin.esbuild inside createStylexPlugin in buildRenderBundle.ts");
  }
  const block = extractBalancedBraces(source, idx + marker.length);
  return parseObjectLiteral(block);
}

function extractStylexBunTestPluginOptions(source: string): StylexConfig {
  const marker = '"@stylexjs/babel-plugin",';
  const idx = source.indexOf(marker);
  if (idx === -1) {
    throw new Error("Could not find @stylexjs/babel-plugin in stylexBunTestPlugin.ts");
  }
  const block = extractBalancedBraces(source, idx + marker.length);
  return parseObjectLiteral(block);
}

describe("StyleX build configuration source contract", () => {
  it("disables useCSSLayers in esbuild.config.js client bundle plugin", () => {
    const options = extractEsbuildConfigStylexOptions(esbuildConfigSource);
    expect(options.useCSSLayers).toBe(false);
  });

  it("disables useCSSLayers in esbuild.config.js CSS collection instance", () => {
    const options = extractEsbuildConfigCollectInstanceOptions(esbuildConfigSource);
    expect(options.useCSSLayers).toBe(false);
  });

  it("disables useCSSLayers in buildRenderBundle.ts SSR render bundle plugin", () => {
    const options = extractBuildRenderBundleStylexOptions(buildRenderBundleSource);
    expect(options.useCSSLayers).toBe(false);
  });

  it("disables useCSSLayers in stylexBunTestPlugin.ts bun test preload plugin", () => {
    const options = extractStylexBunTestPluginOptions(stylexBunTestPluginSource);
    expect(options.useCSSLayers).toBe(false);
  });

  it("maintains strict configuration parity across all 4 StyleX compilation call sites", () => {
    const clientPluginOptions = extractEsbuildConfigStylexOptions(esbuildConfigSource);
    const clientCollectOptions = extractEsbuildConfigCollectInstanceOptions(esbuildConfigSource);
    const ssrPluginOptions = extractBuildRenderBundleStylexOptions(buildRenderBundleSource);
    const testPluginOptions = extractStylexBunTestPluginOptions(stylexBunTestPluginSource);

    // Both client instances must match
    expect(clientPluginOptions.useCSSLayers).toBe(false);
    expect(clientPluginOptions.importSources).toEqual(["@stylexjs/stylex"]);
    expect(clientPluginOptions.unstable_moduleResolution).toEqual({ type: "commonJS" });

    expect(clientCollectOptions).toEqual(clientPluginOptions);

    // SSR bundle options must match client bundle options
    expect(ssrPluginOptions.useCSSLayers).toBe(clientPluginOptions.useCSSLayers);
    expect(ssrPluginOptions.importSources).toEqual(clientPluginOptions.importSources);
    expect(ssrPluginOptions.unstable_moduleResolution).toEqual(
      clientPluginOptions.unstable_moduleResolution,
    );
    expect(ssrPluginOptions).toEqual(clientPluginOptions);

    // Test plugin options must match client bundle options
    expect(testPluginOptions.useCSSLayers).toBe(clientPluginOptions.useCSSLayers);
    expect(testPluginOptions.importSources).toEqual(clientPluginOptions.importSources);
    expect(testPluginOptions.unstable_moduleResolution).toEqual(
      clientPluginOptions.unstable_moduleResolution,
    );
  });

  it("includes explanatory comments why useCSSLayers must be false", () => {
    expect(esbuildConfigSource).toContain("useCSSLayers: false");
    expect(buildRenderBundleSource).toContain("useCSSLayers: false");
    // Ensure rationale comment mentions unlayered / layer conflict
    expect(esbuildConfigSource).toMatch(/unlayered.*layer/i);
    expect(buildRenderBundleSource).toMatch(/unlayered.*layer/i);
  });
});
