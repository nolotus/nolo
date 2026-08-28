// CF Worker 转发层（worker.ts）
//
// 这是对外的唯一入口（workers.dev 公网 URL）。容器不直接暴露公网，所有请求都经此转发。
//
// 安全（必须）：/build 是生产构建入口，裸奔等于把构建开放给公网。
//   - 校验请求头 X-Builder-Token === env.BUILDER_TOKEN（wrangler secret put BUILDER_TOKEN 注入），
//     不符一律 403，且不向容器转发任何内容。
//   - 容器内 PEM deploy key（env.GITHUB_DEPLOY_KEY）只在转发时注入到容器 /build 的 body，
//     绝不放进 header；worker 本身不把该 key 暴露给调用方。
//   - /artifact 是产物下载口，同样受 X-Builder-Token 保护（产物可能含敏感资源）。

import { Container } from "@cloudflare/containers";

const BUILDER_BINDING = "CF_BUILDER"; // 对应 wrangler.jsonc.template 里 durable_object 绑定名
const CLASS_NAME = "Cfbuilder";        // 对应 containers[].class_name / DurableObject 类名

function authorized(request: Request, env: any): boolean {
  const token = request.headers.get("X-Builder-Token") || "";
  return token.length > 0 && token === env.BUILDER_TOKEN;
}

export class Cfbuilder extends Container {
  defaultPort = 8080;
  sleepAfter = "10m";
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      const url = new URL(request.url);

      // /build 与 /artifact 都是敏感入口，必须鉴权；其余探测路径（/status、/）放行便于冒烟。
      if (url.pathname === "/build" || url.pathname === "/artifact") {
        if (!authorized(request, env)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      const id = env[BUILDER_BINDING].idFromName("builder");
      const container = env[BUILDER_BINDING].get(id, ctx);
      // 部署 rollout 后容器可能处于 stopped 态：显式拉起（幂等；已运行时调用无害）
      try { if (!container.running) await container.start(); } catch { /* start 竞态忽略，fetch 会再兜底 */ }

      if (request.method === "POST" && url.pathname === "/build") {
        const body = await request.json().catch(() => ({})) as any;
        const forward = new Request(new URL("/build", request.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branch: body.branch || "alpha", initKey: env.GITHUB_DEPLOY_KEY }),
        });
        return await container.fetch(forward);
      }

      if (request.method === "GET" && url.pathname === "/artifact") {
        return await container.fetch(new Request(new URL("/artifact", request.url), { method: "GET" }));
      }

      // 其余路径（/status、/、健康检查）直接透传，用于冒烟。
      return await container.fetch(request);
    } catch (e: any) {
      return new Response("worker-err: " + String(e?.message || e) + "\n" + String(e?.stack || "").slice(0, 800), { status: 500 });
    }
  },
};
