// packages/server/handlers/desktopRuntimeHandlers.ts
//
// 桌面运行时 handler 的聚合 re-export 入口（不含 local-connector，后者保留在
// desktopRuntimeRoutes.ts 内的独立动态 import）。
// 之所以集中在一个文件，是为了让 desktopRuntimeRoutes.ts 的懒加载只需要一次
// 动态 import 就能把桌面 handler 都拉进来——而不是每个路由各发起一次动态
// import（那样会把单次 import 成本放大到 N 倍，还会把同源依赖重复加载）。
// 与 agentRunHandlers.ts 在 agentRunRoutes 懒加载里扮演的角色相同。
//
// 这里只做 re-export，不新增任何逻辑。handler 的真实实现仍在各自的原文件里。

export { handleDesktopPickFolder } from "./desktopPickFolderHandler";
export {
  handleDesktopLlamaRuntimeGet,
  handleDesktopLlamaRuntimePost,
} from "./desktopLlamaRuntimeHandler";
export { handleDesktopAgentRuntimeStatusGet } from "./desktopAgentRuntimeStatusHandler";
export { handleDesktopAgentRuntimeTurnPost } from "./desktopAgentRuntimeTurnHandler";
export {
  handleDesktopChromeConnectorInstallNativeHostPost,
  handleDesktopChromeConnectorSmokeTestPost,
  handleDesktopChromeConnectorStatusGet,
} from "./desktopChromeConnectorHandler";
export {
  handleDesktopUpdaterGet,
  handleDesktopUpdaterPost,
} from "./desktopUpdaterHandler";
export { handleDesktopClipboardPost } from "./desktopClipboardHandler";
export { handleDesktopCredentialsPost } from "./desktopCredentialBrokerHandler";
export { handleDesktopAuthSessionGet } from "./desktopAuthSessionHandler";
export {
  handleDesktopOAuthDelete,
  handleDesktopOAuthStartPost,
  handleDesktopOAuthStatusGet,
} from "./desktopOAuthHandler";