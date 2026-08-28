import { isProduction } from "utils/env";

const config = {
  entrypoints: ["./packages/web/entry.tsx"],
  outdir: "public",
  minify: isProduction ? { whitespace: true, syntax: true } : false,
  target: "browser",
};

export async function runBuild() {
  try {
    const build = await Bun.build(config);
    for (const output of build.outputs) {
      await output;
    }
  } catch (error) {
    console.error("Build failed:", error);
    throw error;
  }
}
