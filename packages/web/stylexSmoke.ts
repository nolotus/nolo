// StyleX 管线冒烟模块（smoke canary）。
// 目的：端到端验证 web esbuild 构建管线里的 StyleX 支持：
//   1) stylex.create：静态样式在构建期被 @stylexjs/unplugin 编译为类名 + CSS 规则，
//      规则由插件聚合进 entry CSS 产物（scripts/dev/stylexSmoke.test.ts 断言）；
//   2) stylex.props：官方 JSX-spread 形态（顶层预编译、直接 {...} 展开）——
//      静态声明构建期编译为内联 style（零运行时开销，不产生 CSS 规则），
//      动态值则保留运行时调用；
//   3) 页面加载后把两者的编译产物写到 <html data-stylex-smoke>，
//      可在浏览器 DevTools 里直接核验类名与 CSS 规则是否匹配。
// 注意：改动/删除本模块前请先跑 `bun test scripts/dev/stylexSmoke.test.ts`。
import { create, props } from "@stylexjs/stylex";
import "./stylexSmoke.css";

// create：3 条静态声明 → 3 个类名（StyleX 按声明优先级分层输出 @layer 规则）
export const stylexSmokeBadge = create({
  badge: {
    backgroundColor: "#1234ff",
    borderRadius: 4,
    padding: "2px 8px",
  },
});

// props：顶层预编译一次，供任意 JSX 直接展开（如 <span {...stylexSmokeSpread} />）。
// 构建期静态声明被编译为 { style: {...} }，无运行时依赖。
export const stylexSmokeSpread = props({
  color: "#ff1234",
  margin: "2px",
});

// 仅浏览器端副作用：把构建期编译产物写到 <html data-stylex-smoke>，方便人工核验。
// 编译后 badge 形如 { <hashKey>: "x<类名>", $$css: true }，spread 形如 { style: {...} }。
if (typeof document !== "undefined") {
  document.documentElement.dataset.stylexSmoke = JSON.stringify({
    badge: stylexSmokeBadge.badge,
    spread: stylexSmokeSpread,
  });
}
