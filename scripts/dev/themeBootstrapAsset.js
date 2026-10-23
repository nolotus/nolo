import { transform } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getThemeBootstrapUrl, themeBootstrapFile, themeBootstrapSource } from "../../packages/app/theme/themeBootstrap";

/** Publish before the manifest: fail the build if the exact asset is not on disk. */
export async function writeThemeBootstrapAsset(outdir, publicPath) {
  const { code } = await transform(themeBootstrapSource, { loader: "js", minify: true, target: "es2020" });
  const path = join(outdir, themeBootstrapFile);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, code);
  if (await readFile(path, "utf8") !== code) {
    throw new Error(`Theme bootstrap publication mismatch: ${path}`);
  }
  return { path, bytes: Buffer.byteLength(code), url: getThemeBootstrapUrl(publicPath) };
}
