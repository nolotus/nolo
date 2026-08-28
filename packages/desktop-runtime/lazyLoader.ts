// 通用懒加载器工厂：Promise 缓存 + 失败清空重试。
//
// 用法：
//   const loadHandlers = createLazyLoader(() => import("./handlers/foo"));
//   const mod = await loadHandlers();
//
// 可选冷却窗口（失败后一段时间内共享 rejection，避免每个请求都重跑失败的 import）：
//   const loadHandlers = createLazyLoader(() => import("./heavy"), { cooldownMs: 5_000 });
//
// 所有路由懒加载模块（cliChatRoutes / appRoutes / appSandboxLazy /
// agentRunRoutes / cloudflareRoutes / mediaRoutes / webUtilityRoutes /
// desktopRuntimeRoutes / routes.ts chatHandler）都用这个工厂，
// 保证行为一致：首次调用触发 import，Promise 缓存；失败清空缓存让下次重试。

type LazyLoaderOptions = {
  /** 失败后的冷却窗口（ms）。冷却期内共享同一个 rejection，避免持续失败的 import 每次请求都重跑。0 = 立即重试。 */
  cooldownMs?: number;
  /** 失败时的日志回调（默认无）。 */
  onError?: (error: unknown) => void;
};

export function createLazyLoader<T>(
  importFn: () => Promise<T>,
  options: LazyLoaderOptions = {},
): () => Promise<T> {
  let promise: Promise<T> | null = null;
  let retryAt = 0;
  const cooldownMs = options.cooldownMs ?? 0;
  const onError = options.onError;

  return () => {
    // 冷却到期：丢弃失败的 promise，让下次真正重试
    if (retryAt > 0 && Date.now() >= retryAt) {
      promise = null;
      retryAt = 0;
    }

    if (!promise) {
      promise = importFn().catch((error) => {
        // onError 日志不能破坏 loader 恢复逻辑
        try { onError?.(error); } catch { /* logging must not break recovery */ }
        if (cooldownMs > 0) {
          // 保留失败的 promise，冷却期内共享 rejection
          retryAt = Date.now() + cooldownMs;
        } else {
          // 无冷却：立即清空，让下次重试
          promise = null;
        }
        throw error;
      });
    }

    return promise;
  };
}

/**
 * 从懒加载模块创建 lazy handler wrapper。
 *
 * 用法：
 *   const loadHandlers = createLazyLoader(() => import("./handlers/foo"));
 *   const handleFoo = lazyHandler(loadHandlers, "handleFoo");
 *   // handleFoo(req) → 首次调用时动态 import，之后复用缓存
 *
 * 避免为每个 handler 手写 async wrapper。
 */
export function lazyHandler<
  T extends Record<string, unknown>,
  K extends keyof T,
>(
  loader: () => Promise<T>,
  handlerKey: K,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const mod = await loader();
    const handler = mod[handlerKey] as
      | ((req: Request) => Promise<Response> | Response)
      | undefined;
    if (!handler) {
      throw new Error(`lazyHandler: handler '${String(handlerKey)}' not found in module`);
    }
    return handler(req);
  };
}