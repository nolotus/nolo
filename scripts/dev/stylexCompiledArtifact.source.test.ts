import { describe, expect, it } from "bun:test";
import { build } from "esbuild";
import stylexUnplugin from "@stylexjs/unplugin";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const plugin = stylexUnplugin.esbuild({ useCSSLayers: false, importSources: ["@stylexjs/stylex"], unstable_moduleResolution: { type: "commonJS" }, enableMediaQueryOrder: false });

describe("StyleX compiled artifact contract", () => {
  it("emits every supported declaration and condition into CSS", async () => {
    const dir = await mkdtemp(join(tmpdir(), "stylex-artifact-"));
    try {
      await writeFile(join(dir, "host.css"), ".host { display: block; }\n");
      await writeFile(join(dir, "entry.stylex.ts"), `import "./host.css"; import * as stylex from "@stylexjs/stylex";
export const vars = stylex.defineVars({ accent: "#456789" });
export const theme = stylex.createTheme(vars, { accent: "#abcdef" });
export const frames = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
export const styles = stylex.create({ root: { backgroundColor: "red", backgroundImage: "url(x)", borderWidth: 1, borderStyle: "solid", borderColor: "black", color: "blue", ":hover": { color: "green" }, "@media (max-width: 600px)": { margin: 2 }, animationName: frames, animationDuration: "1s", animationTimingFunction: "ease" } });
void [styles.root, theme, vars, frames];`);
      const outdir = join(dir, "out");
      const result = await build({ entryPoints: [join(dir, "entry.stylex.ts")], bundle: true, write: true, outdir, metafile: true, plugins: [plugin], logLevel: "silent" });
      const cssFile = Object.keys(result.metafile!.outputs).find((f) => f.endsWith(".css"));
      expect(cssFile).toBeDefined();
      const css = await readFile(cssFile!, "utf8");
      for (const declaration of ["background-color", "background-image", "border-width", "border-style", "border-color", "color", "animation-name", "animation-duration", "animation-timing-function", "opacity"]) expect(css).toContain(declaration);
      expect(css).toContain(":hover"); expect(css).toContain("@media"); expect(css).toContain("--x1q0mdyo");
    } finally { await rm(dir, { recursive: true, force: true }); }
  }, 15_000);
});
