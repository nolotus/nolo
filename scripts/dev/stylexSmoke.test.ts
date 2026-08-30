import { describe, expect, it } from "bun:test";
import { build } from "esbuild";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "./esbuild.config.js";

/**
 * StyleX esbuild 管线冒烟测试：
 * 用仓库真实构建配置（含 @stylexjs/unplugin 插件）对 packages/web/stylexSmoke.ts
 * 做一次最小构建，断言：
 *  1) stylex.create 的静态声明被编译为类名，且规则被聚合进 CSS 产物（含 @layer）；
 *  2) stylex.props 的静态声明被编译为内联 style（官方 spread 形态的构建期契约）；
 *  3) JS 产物里的每个 StyleX 类名在 CSS 里都有对应选择器（交叉验证）。
 *
 * 注意：必须 write:true —— @stylexjs/unplugin 的 esbuild 适配在 onEnd 时
 * 从磁盘读取 CSS 产物再追加 StyleX 规则（write:false 时产物不落盘，规则不会进入输出）。
 */
describe("stylex esbuild pipeline smoke", () => {
  it("aggregates StyleX rules into the built CSS and keeps class names in sync", async () => {
    const outdir = await mkdtemp(join(tmpdir(), "nolo-stylex-smoke-"));
    try {
      const result = await build({
        ...config,
        // 最小入口：只构建冒烟模块（它自己导入 CSS 宿主文件）
        entryPoints: ["packages/web/stylexSmoke.ts"],
        // 隔离输出，避免污染 public/
        outdir,
        metafile: true,
        // 固定为 dev 风格命名/不压缩，保证输出名确定、断言稳定
        minify: false,
        entryNames: "[name]",
        logLevel: "silent",
      });

      const outputNames = Object.keys(result.metafile?.outputs ?? {});
      const cssRel = outputNames.find((f) => f.endsWith("stylexSmoke.css"));
      expect(cssRel).toBeDefined();
      const jsRel = outputNames.find((f) => f.endsWith("stylexSmoke.js"));
      expect(jsRel).toBeDefined();

      const toAbs = (p: string) => (p.startsWith("/") ? p : join(process.cwd(), p));
      const css = await readFile(toAbs(cssRel as string), "utf8");
      const js = await readFile(toAbs(jsRel as string), "utf8");
      const flatCss = css.replace(/\s+/g, "");
      const flatJs = js.replace(/\s+/g, "");

      // 1) stylex.create 的规则确实被写进了 CSS 产物（冒烟模块里的声明值），且走 @layer 输出
      expect(flatCss).toContain("@layer");
      expect(flatCss).toContain("background-color:#1234ff");
      expect(flatCss).toContain("border-radius:4px");
      expect(flatCss).toContain("padding:2px8px");

      // 2) JS 产物携带 stylex.create 编译标记
      expect(flatJs).toContain("$$css:true");

      // stylex.props 的构建期契约：静态声明编译为内联 style 对象（无运行时调用）
      expect(flatJs).toContain('style:{color:"#ff1234",margin:"2px"}');

      // 3) 交叉验证：JS 里的每个 StyleX 类名（"x" + 小写数字字母串，带引号的字符串字面量）
      //    在 CSS 里都有对应选择器
      const classNames = Array.from(
        new Set(
          (flatJs.match(/"(x[0-9a-z]{6,})"/g) ?? []).map((s) => s.slice(1, -1)),
        ),
      );
      expect(classNames.length).toBeGreaterThanOrEqual(3);
      for (const name of classNames) {
        expect(flatCss).toContain(`.${name}`);
      }
    } finally {
      await rm(outdir, { recursive: true, force: true });
    }
  }, 60_000);

  /**
   * 多 entry + splitting 场景（复现 2026-08-28 生产踩坑）：
   * metafile 里存在多个 CSS 输出时，@stylexjs/unplugin 的 esbuild 适配默认把
   * StyleX 规则追加到「第一个 .css 输出」——可能是任意懒加载 chunk。
   * 仓库的 stylex-css-redirect-to-entry 插件负责把规则纠正到 entry CSS。
   * 断言：规则最终只存在于 entry.css，且恰好一份。
   */
  it("redirects StyleX rules into the entry CSS when multiple CSS outputs exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "nolo-stylex-redirect-"));
    const outdir = join(dir, "out");
    const stylexSmokePath = join(process.cwd(), "packages/web/stylexSmoke.ts");
    // entry：导入 StyleX 冒烟模块（其 CSS 宿主进入 entry.css 输出）
    // other 排在 entry 前面：让 other.css 成为 metafile 里第一个 CSS 输出，
    // 逼出 unplugin 默认选中的错误目标（无重定向时规则会落在 other.css）。
    await writeFile(join(dir, "entry.ts"), `import ${JSON.stringify(stylexSmokePath)};\n`);
    // other：模拟另一个 entry（如 artifactRuntime），带独立 CSS 宿主
    await writeFile(join(dir, "host2.css"), "/* host2 */\n.host2-marker { color: red; }\n");
    await writeFile(join(dir, "other.ts"), `import "./host2.css";\n`);
    try {
      const result = await build({
        ...config,
        entryPoints: [join(dir, "other.ts"), join(dir, "entry.ts")],
        outdir,
        metafile: true,
        splitting: true,
        minify: false,
        entryNames: "[name]",
        logLevel: "silent",
      });

      const outputNames = Object.keys(result.metafile?.outputs ?? {});
      const cssOutputs = outputNames.filter((f) => f.endsWith(".css"));
      const toAbs = (p: string) => (p.startsWith("/") ? p : join(process.cwd(), p));
      const withRules: string[] = [];
      for (const f of cssOutputs) {
        const content = await readFile(toAbs(f), "utf8");
        if (content.includes("#1234ff")) withRules.push(f);
      }
      // entry.css / other.css 都应存在
      expect(cssOutputs.some((f) => f.endsWith("entry.css"))).toBe(true);
      expect(cssOutputs.some((f) => f.endsWith("other.css"))).toBe(true);
      // 规则恰好一份，且在 entry CSS
      expect(withRules.length).toBe(1);
      expect(withRules[0]).toMatch(/entry\.css$/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it("compiles defineVars and all 18 createTheme classes into static CSS", async () => {
    const outdir = await mkdtemp(join(tmpdir(), "nolo-stylex-theme-smoke-"));
    const dir = await mkdtemp(join(tmpdir(), "nolo-theme-src-"));
    const hostCssPath = join(dir, "themeHost.css");
    const entryTsPath = join(dir, "themeEntry.ts");
    const agentThemePath = join(process.cwd(), "packages/app/theme/agentTheme.stylex");

    await writeFile(hostCssPath, ".theme-host { display: block; }\n");
    await writeFile(
      entryTsPath,
      `import "./themeHost.css";
import * as stylex from "@stylexjs/stylex";
import {
  agentThemeTokens,
  neutralLight, neutralDark,
  oceanLight, oceanDark,
  forestLight, forestDark,
  trailLight, trailDark,
  waveLight, waveDark,
  irisLight, irisDark,
  roseLight, roseDark,
  monoLight, monoDark,
  catppuccinLight, catppuccinDark,
  AGENT_THEMES,
} from ${JSON.stringify(agentThemePath)};

const styles = stylex.create({
  header: {
    background: agentThemeTokens.surfaceGlassHeader,
    borderColor: agentThemeTokens.borderGlassHeader,
    boxShadow: agentThemeTokens.shadowFooterUpward,
  },
  card: {
    background: agentThemeTokens.surfaceOverlayHairline,
    borderColor: agentThemeTokens.borderOverlayHairline,
  },
});

console.log(styles, AGENT_THEMES);
`
    );

    try {
      const result = await build({
        ...config,
        entryPoints: [entryTsPath],
        outdir,
        metafile: true,
        minify: false,
        entryNames: "[name]",
        logLevel: "silent",
      });

      const outputNames = Object.keys(result.metafile?.outputs ?? {});
      const cssRel = outputNames.find((f) => f.endsWith("themeEntry.css"));
      expect(cssRel).toBeDefined();
      const jsRel = outputNames.find((f) => f.endsWith("themeEntry.js"));
      expect(jsRel).toBeDefined();

      const toAbs = (p: string) => (p.startsWith("/") ? p : join(process.cwd(), p));
      const css = await readFile(toAbs(cssRel as string), "utf8");
      const js = await readFile(toAbs(jsRel as string), "utf8");

      // 1) 存在 :root 初始变量定义
      expect(css).toContain(":root");

      // 2) 存在 18 个 createTheme 产出的主题类选择器（去重后精确 18 个）
      const themeClassSelectors = css.match(/\.x[0-9a-z]+\.x[0-9a-z]+/g) ?? [];
      const uniqueThemeClassSelectors = new Set(themeClassSelectors);
      // 9 themes * 2 (light/dark) = 18 themes
      expect(uniqueThemeClassSelectors.size).toBe(18);

      // 3) 样式规则引用了生成的 StyleX 变量 (var(--x...))
      expect(css).toMatch(/var\(--x[0-9a-z]+\)/);

      // 4) JS 产物包含 9 个核心主题的主题对象
      for (const name of [
        "neutral", "ocean", "forest", "trail", "wave",
        "iris", "rose", "mono", "catppuccin"
      ]) {
        expect(js).toContain(`${name}Light`);
        expect(js).toContain(`${name}Dark`);
      }
    } finally {
      await rm(outdir, { recursive: true, force: true });
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
