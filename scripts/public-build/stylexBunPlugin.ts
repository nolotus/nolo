/**
 * Bun preload: 为 StyleX 静态 API 提供 Babel 编译通道。
 *
 * 背景：@stylexjs/stylex 的 create/keyframes/defineVars/createTheme 是
 * 「编译期 API」——未经 @stylexjs/babel-plugin 编译的模块在 bun 裸运行时
 * 直接调用会 throw（"Unexpected 'stylex.create' call at runtime"）。
 * 客户端 / SSR bundle 由 @stylexjs/unplugin（esbuild）编译；裸 bun 进程
 * （dev server SSR、CLI、agent run worker 以及 bun test）没有独立管线，
 * 因此在 preload 进程内注册 Bun.plugin，对纯 TS 的样式载体文件做同样的
 * 静态编译（与 esbuild 配置同参数，class hash 确定性一致）。
 *
 * 缺陷修复（2026-08-30）：
 * 之前正则 /(^|\/)[^/]*[Ss]tyles\.ts$|(^|\/)[^/]*\.stylex\.ts$/ 过宽，
 * 误匹配到了 packages/cli/client/terminalStyles.ts 等非 StyleX 的纯 TS 模块。
 * 在 Bun 1.3.14 runner 中，Bun.plugin onLoad 对匹配到的模块若返回 undefined，
 * 会导致模块解析抛出 "Expected module mock to return an object"。
 * 修复：将 filter 精确限定在包含 StyleX 样式的目录与 .stylex.ts 文件中，
 * 避免无关模块被拦截。
 *
 * 只编译 *Styles.ts / *.stylex.ts 这类纯 TS 文件（无 JSX）：
 * - 组件 TSX 里的 stylex.props() 是运行时安全函数（styleq 合并类名），
 *   接收已编译的样式对象即可，无需 Babel；
 * - JSX/TS 语法交给 bun 原生 loader，避免 Babel 重排代码。
 */
import { transformAsync } from "@babel/core";

const STYLEX_FILE_FILTER =
  /(^|\/)packages\/(?:ai\/agent|app|auth|chat|create|life|render)\/.*([Ss]tyles\.ts|\.stylex\.ts)$/;

Bun.plugin({
  name: "stylex-static-compile",
  setup(build) {
    // @babel/core 的 transformAsync 在 bun 下并发调用不安全（内部缓存竞态，
    // 会以 "Invalid media query syntax" 之类的假错炸掉 transform，2026-09-02
    // life 页 StyleX 迁移新增 15 个 *Styles.ts 后在多目录合跑中稳定复现）。
    // 这里用 promise 链把所有 onLoad 的编译串行化：文件数量增长不改变正确性。
    let compileChain: Promise<unknown> = Promise.resolve();

    build.onLoad({ filter: STYLEX_FILE_FILTER }, async (args) => {
      const source = await Bun.file(args.path).text();
      if (!source.includes("@stylexjs/stylex")) return undefined;

      const task = compileChain.then(async () => {
        const result = await transformAsync(source, {
          filename: args.path,
          babelrc: false,
          configFile: false,
          sourceType: "module",
          parserOpts: { plugins: ["typescript"] },
          plugins: [
            // 纯 TS 载体文件：先剥类型再跑 stylex（无 JSX，交给 bun loader）
            "@babel/plugin-transform-typescript",
            [
              "@stylexjs/babel-plugin",
              {
                // 与 scripts/dev/esbuild.config.js / buildRenderBundle.ts 保持一致
                useCSSLayers: false,
                importSources: ["@stylexjs/stylex"],
                unstable_moduleResolution: { type: "commonJS" },
                dev: false,
                runtimeInjection: false,
                // 显式关闭：0.19 默认开启的 lastMediaQueryWinsTransform 在 bun
                // 下的模块图会因 @stylexjs/shared 的 MediaQuery parser
                // 循环依赖加载顺序差异，把合法的 "@media (max-width: ...)"
                // key 误判为非法（node/esbuild 同配置正常，bun test 稳定炸）。
                // 运行时编译只用于运行时类名合并，不消费 media 规则排序语义；
                // 本仓样式同属性至多一个断点，last/first-wins 无行为差异。
                enableMediaQueryOrder: false,
              },
            ],
          ],
        });
        return { contents: result?.code ?? source, loader: "js" as const };
      });
      // 失败不许断链：后续文件的编译仍要继续（各自抛各自的错）。
      compileChain = task.catch(() => undefined);
      return task;
    });
  },
});
