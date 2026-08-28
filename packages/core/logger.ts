import pino from "pino";

// 全局共享的服务端 logger。原先定义在 auth/server/shared.ts，
// 下沉到 core 以便不依赖 auth 的包（本地 runtime、开源集）也能使用；
// auth/server/shared.ts 继续 re-export，保持单实例与旧 import 路径兼容。
export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});
