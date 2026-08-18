// packages/desktop-runtime/index.ts
// 公开入口：re-export 路由和入口点供外部消费

export { desktopRuntimeRoutes, prewarmDesktopRuntimeRoutes } from "./desktopRuntimeRoutes";
export { bootstrapServer, shutdownServer } from "./entry";
export type { ApiMethod, ApiErrorShape, ApiError } from "./apiContract";
export { ApiError, apiSuccess, apiError } from "./apiContract";
export { isLoopbackRequest, isTrustedDesktopRequest } from "./desktopRequestTrust";