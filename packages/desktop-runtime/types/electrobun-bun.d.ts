// server typecheck 会传递检查 desktop-runtime 的 desktopUpdaterHandler
// （动态 import electrobun/bun），而 Electrobun SDK 类型只在 desktop 工程可用；
// 此处有意声明为 untyped 模块（electrobun/bun 在该 program 内解析为 any）。
declare module "electrobun/bun";
