import { describe, expect, it } from "bun:test";
import { transformAsync } from "@babel/core";

describe("StyleX literal hook survival", () => {
  it("keeps the legacy hook beside the generated StyleX class", async () => {
    const source = `import * as stylex from "@stylexjs/stylex";
import { withLiteralClass } from "../../packages/chat/messages/web/toolMessageShared";
const styles = stylex.create({ root: { color: "rebeccapurple" } });
export const View = () => <div {...withLiteralClass("legacy-hook", styles.root)} />;`;
    const result = await transformAsync(source, { filename: "stylexLiteralHookFixture.tsx", babelrc: false, configFile: false, parserOpts: { plugins: [["typescript", { isTSX: true }], "jsx"] } as unknown as import("@babel/core").ParserOptions, plugins: [["@babel/plugin-transform-react-jsx", { runtime: "automatic" }], ["@stylexjs/babel-plugin", { useCSSLayers: false, importSources: ["@stylexjs/stylex"], unstable_moduleResolution: { type: "commonJS" } }]] });
    const output = result?.code ?? "";
    expect(output).toContain("legacy-hook");
    expect(output).toMatch(/x[a-zA-Z0-9_-]{4,}/);
  });
});
