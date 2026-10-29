import { lazy, type ComponentType } from "react";

/**
 * 带超时与重试的 `React.lazy`。
 *
 * 为什么需要：懒加载的 `import()` 如果**永不 settle**（chunk 请求卡住/被代理吞掉），
 * React 会永远渲染 Suspense fallback，而且不会抛错——error boundary 没有机会介入，
 * 用户看到的就是永久「加载中...」，与「还在加载」无法区分（alpha 实测形态）。
 *
 * 这里把「等」变成一次有界的 promise：超时就 reject，交给上层的 error boundary
 * 显示可操作的错误页。不替换、不卸载已经正常渲染的内容。
 */
export const lazyWithTimeout = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: { timeoutMs?: number; retries?: number } = {}
) => {
  // 默认不重试：按 HTML module map 语义，失败的条目会被置为 errored（后续 import
  // 直接 reject、不再发请求），pending 的条目会挂到同一个永不 settle 的请求上。
  // 也就是说重试既拉不到 chunk，在「永不 settle」这个唯一目标场景里只是让用户
  // 多等一个 timeout。真要重试必须换 URL（cache-bust），静态 import() 做不到。
  const { timeoutMs = 15_000, retries = 0 } = options;

  return lazy(async () => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          factory(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () =>
                reject(
                  new Error(`模块加载超时（${Math.round(timeoutMs / 1000)}s）`)
                ),
              timeoutMs
            );
          }),
        ]);
      } catch (error) {
        lastError = error;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("模块加载失败");
  });
};
