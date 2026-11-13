// agent 窗口真值只此一处，其它地方不得各自解析。
import { resolveOccupancyWindow } from "./contextOccupancy";

export type AgentContextWindowRef = { model?: string | null; provider?: string | null; apiKeyRef?: string | null; agentKey?: string | null; agentName?: string | null };

/**
 * 解析 agent 的上下文窗口；未知就返回 undefined，不套通用默认值。
 *
 * 通道身份（apiKeyRef）必须一起透传：同一个 model id 在不同通道上窗口不同，
 * Codex OAuth（apiKeyRef="chatgpt"）的窗口真值按账号从上游模型目录取，通道
 * 判据只有 apiKeyRef 一个。早先本函数只传 model/provider，Web 面板因此在
 * OAuth 通道上永远解析到静态 pin，而本地循环用完整 agentConfig 走目录——
 * 两个分母一旦随账号档位分叉，面板与实际压缩预算就会互相打架。
 *
 * 注意范围：这里只保证「通道身份不丢」。浏览器进程目前没有目录播种入口
 * （ensureCodexOAuthModelCatalog 只在 CLI / server 进程调用，见
 * codexOAuthTransport.ts:170 与 loopUpstream.ts:768），所以 Web 面板即便带上
 * apiKeyRef 仍会回落静态 pin——要让面板分母跟上账号目录，需要先把窗口数据
 * 带到浏览器端。
 *
 * model 优先于显示名：品牌名 "nolo" 本身无法表达实际模型，曾因此被误判为
 * 256k。显示名 "OpenDesign V4.1 Flash" 的 fuzzy 查询也可能 miss，必须继续
 * 尝试 key / 显示名里的模型 slug，否则 1M 模型的占用百分比会被虚高 4 倍。
 */
export function resolveAgentContextWindow(ref: AgentContextWindowRef): number | undefined {
  const byModel = resolveOccupancyWindow({ model: ref.model, provider: ref.provider, apiKeyRef: ref.apiKeyRef });
  if (byModel !== undefined) return byModel;

  const byName = ref.agentName?.trim()
    ? resolveOccupancyWindow({ model: ref.agentName, provider: ref.provider, apiKeyRef: ref.apiKeyRef })
    : undefined;
  if (byName !== undefined) return byName;

  const candidates = [
    ...modelSlugCandidates(ref.agentKey, 2),
    ...modelSlugCandidates(ref.agentName, 1),
  ];
  for (const candidate of candidates) {
    const window = resolveOccupancyWindow({ model: candidate, provider: ref.provider, apiKeyRef: ref.apiKeyRef });
    if (window !== undefined) return window;
  }
  return undefined;
}

/** agentKey 的 `agent-<uid>-` 前缀不是模型名的一部分。 */
const AGENT_KEY_PREFIX = /^agent-[a-z0-9]+-/i;

/**
 * 候选从完整到逐段剥离 provider / 品牌前缀，不写死任何 provider 或模型名。
 * 显示名空格换连字符，保留点号；命中与否交给同一窗口解析链。
 */
function modelSlugCandidates(source: string | null | undefined, maxDrop: number): string[] {
  const raw = source?.trim();
  if (!raw) return [];
  const base = raw.replace(/\s+/g, "-").toLowerCase();
  const seed = base.replace(AGENT_KEY_PREFIX, "");
  const out = [seed];
  if (seed !== base) out.push(base);
  const segments = seed.split("-");
  for (let drop = 1; drop <= maxDrop && drop < segments.length; drop++) {
    out.push(segments.slice(drop).join("-"));
  }
  return [...new Set(out.filter(Boolean))];
}
