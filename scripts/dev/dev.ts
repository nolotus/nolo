import { handleRequest } from "server/handleRequest";

import { runBuild } from "./bunBuild";

await runBuild();
// 启动 http 服务器
// Bun.serve overloads require websocket when inference collapses; assert HTTP-only options.
const serveOptions = {
  port: 80,
  hostname: "0.0.0.0" as const,
  idleTimeout: 0,
  fetch: handleRequest,
};
Bun.serve(serveOptions as Parameters<typeof Bun.serve>[0]);
