/**
 * bun test preload：为 StyleX 静态 API 提供 Babel 编译通道。
 *
 * 背景：@stylexjs/stylex 的 create/keyframes/defineVars/createTheme 是
 * 「编译期 API」——未经 @stylexjs/babel-plugin 编译的模块在 bun 裸运行时
 * 直接调用会 throw（"Unexpected 'stylex.create' call at runtime"）。
 * 客户端 / SSR bundle 由 @stylexjs/unplugin（esbuild）编译；bun test 没有
 * 这条管线，而迁移后 chat 组件的 *.test.tsx 会真实 import *Styles.ts，
 * 因此在测试进程内注册 Bun.plugin，对纯 TS 的样式载体文件做同样的
 * 静态编译（与 esbuild 配置同参数，class hash 确定性一致）。
 *
 * 只编译 *Styles.ts / *.stylex.ts 这类纯 TS 文件（无 JSX）：
 * - 组件 TSX 里的 stylex.props() 是运行时安全函数（styleq 合并类名），
 *   接收已编译的样式对象即可，无需 Babel；
 * - JSX/TS 语法交给 bun 原生 loader，避免 Babel 重排代码。
 */
import { transformAsync } from "@babel/core";

const STYLEX_FILE_FILTER =
  /(^|\/)[^/]*[Ss]tyles\.ts$|(^|\/)[^/]*\.stylex\.ts$/;

Bun.plugin({
  name: "stylex-static-compile",
  setup(build) {
    build.onLoad({ filter: STYLEX_FILE_FILTER }, async (args) => {
      const source = await Bun.file(args.path).text();
      if (!source.includes("@stylexjs/stylex")) return undefined;

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
              useCSSLayers: true,
              importSources: ["@stylexjs/stylex"],
              unstable_moduleResolution: { type: "commonJS" },
              dev: false,
              runtimeInjection: false,
            },
          ],
        ],
      });

      return { contents: result?.code ?? source, loader: "js" };
    });
  },
});
