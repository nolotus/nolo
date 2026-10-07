/**
 * 对话压缩的共享逻辑：web 端 `updateDialogSummaryAction` 和 local 端
 * `localAutoCompaction` 共用同一套摘要 prompt、消息格式化和文件操作提取。
 *
 * 之前两套实现各自维护一份 prompt（web 两段式、local 三段式），导致同一对话
 * 在 web 和 CLI 摘要格式不一致。现在统一到三段式（含文件操作清单），并提取
 * 共享函数避免漂移。
 *
 * --- 添加新的压缩路径 ---
 *
 * 如果要加第四套压缩实现（如 mobile），按以下步骤：
 * 1. 决策：调 `planCompression(input)` 获取 CompressionPlan
 * 2. 格式化：调 `formatMessagesForSummaryWithTruncation(plan.msgsToCompress)`
 *    + `formatFileOperationsFromMessages(msgs, resolveCanonicalName)`
 * 3. 构造 prompt：调 `buildCompactionUserContent({ previousSummary, messagesText, fileOpsText })`
 * 4. 调 LLM：system message 用 `COMPACTION_SUMMARY_SYSTEM_PROMPT`
 * 5. 落库：存 summary + summarizedBeforeId + referenceKeys + compressionCount
 * 6. 注入：用 `wrapHistoricalSummaryWithReplayGuard(summary)` 包装后注入
 * 7. 埋点：调 `buildCompactionMetricsFromPlan({ reason, previousSummary, plan, newSummary })`
 */

import { serializeMessageContent } from "../../chat/messages/messageContent";
import { estimateTokenCount } from "./tokenUtils";
import { getMessageTokenCount, type TokenCountableMessage } from "./planCompression";

/**
 * 摘要记录（dialog summary）的生成逻辑版本号。
 *
 * sourceHash 只检测「历史变了」，不检测「摘要 prompt / 投影格式变了」——旧历史 +
 * 新逻辑时哈希照样匹配，旧摘要会被继续信任。此版本位用于在摘要生成逻辑或投影
 * 格式改版时主动让旧摘要失效：载入时若 stored.schemaVersion 已定义且不等于当前
 * 值，判摘要无效并丢弃（走重新压缩）；字段缺失（旧记录）按 v1 处理，零迁移。
 *
 * 版本历史：
 *   - v1：三段式（关键事实档案 / 对话进展与待办 / 文件操作清单）
 *   - v2：关键事实档案的**前两项固定为「原始目标」与「目标演化」**——压缩后接手的新
 *     会话必须知道"最初为什么做这件事"，否则只会抱住待办清单而丢掉目的
 *     （2026-10-02 用户实测：「压缩之后你屁都记不得」）。
 *     代价：v1 摘要会在下次压缩时对完整历史重压缩一次（一次性 token 开销，内容不丢）。
 *
 * 2026-10-06 刻意**不升版本**（保持 v2）：本次「关键事实档案」新增「已证伪的假设」
 * 「卡点与需用户决定」「输入未覆盖」三字段、澄清「原始目标」= 对话最初的意图，并在
 * 4000 预算内改为保留头尾行与证据行（见 truncateContentForSummary；曾评估提高到 16000，
 * 因本地压缩 60s 超时与 HIGH-2 膨胀螺旋被否决）。这些改动可被**增量吸收**：下次正常压缩
 * 以旧摘要为【现有记忆】、按新提示词生成，新字段随之出现；截留策略只影响新输入。
 * 若升到 v3，所有已持久化摘要会立即失效并对完整历史重压缩——长对话（实测 956 条）可能
 * 超过本地压缩 60s 超时（localLoop.ts DEFAULT_COMPACTION_TIMEOUT_MS），造成「消息未提交」
 * 的用户可见失败。只有当旧摘要内容**本身会误导**（而非仅缺字段）时才应升版本。
 */
export const COMPACTION_SUMMARY_SCHEMA_VERSION = 2;

// --- 摘要 prompt ---

/**
 * 统一的对话上下文压缩 system prompt。
 *
 * 三段式输出（关键事实档案 / 对话进展与待办 / 文件操作清单），比原 web 两段式
 * 多了文件操作清单，让摘要能直接回答"之前动过哪些文件"，续作时不必重新扫描。
 *
 * P0-3 增强（学 Kimi 第一人称 handoff）：
 * - 摘要以 agent 第一人称续作笔记的口吻写，不是第三方报告
 * - 保留确切命令、文件路径、变量名、错误信息原文
 * - 标注"声称已做但未验证"的工作（而非默认信任）
 * - 让接收摘要的 agent 从摘要自然续作并复核未验证项
 *
 * 明确禁止调工具，避免对话 agent 的 tool schema 干扰单次 complete。
 */
export const COMPACTION_SUMMARY_SYSTEM_PROMPT = `你是对话上下文压缩器。根据【现有记忆】和【新增对话】，输出可替代原始消息的事实性要点，供后续对话直接使用。

严格只输出下面三部分，标题必须完全一致：
关键事实档案
- ...
对话进展与待办
- ...
文件操作清单
- ...

要求：
1) 使用对话主语言；混合语言时优先用户主要语言；专有名词、文件路径、标识符、命令保留原文，不要翻译或转述。
2) 关键事实档案的**前两项固定是**：
   - 「原始目标」：这段对话**最初**的意图与原话（尽量保留他的原话与用词，不要改写成任务清单）。
     "最初"指开对话那一刻——不得用对话后来的某句用户话（如临睡委托、中期转述）替代最初目标；
     最初原话不在本次压缩范围内时，按「输入未覆盖」写"输入中未见"，再依据对话内最早可考的复述并注明。
     增量更新时沿用【现有记忆】里已有的「原始目标」，不要被新增对话改写——它是稳定字段；
     仅当新对话明确表明原文有事实性错误时才修正，并在「目标演化」里注明。
   - 「目标演化」：若中途转向，写清转向了什么、因为什么；没有转向就写「无转向」或省略这一项，不要硬凑。
   被后续工作取代的是"方案"，不是"用户的初始意图"——初始意图不得省略。
   其后才是：用户偏好、约束、技术栈、确定的文件路径、核心决策、未完成待办。保留确切值（端口号、版本号、路径、变量名、错误信息原文），不要概括成"某个端口"或"某个文件"或"某报错"。
   关键事实档案还必须包含以下三项（可接在固定两项之后，缺信息时如实写明，不得省略）：
   - 「已证伪的假设」：被证据否决或决定不采用的结论单列，注明"已证伪/不采用"及依据，防止续作把它当事实重启。
   - 「卡点与需用户决定」：阻塞项卡在哪、需要用户提供什么（授权 / 凭据 / 决定），写清楚，不得含糊。
   - 「输入未覆盖」：压缩范围内查不到的关键信息（如初始原话、指定 id），必须写"输入中未见"，禁止脑补。
3) 对话进展与待办以第一人称续作笔记的口吻写（"我做了…""用户要求…""下一步我需要…"），不要写成第三方观察报告。先极简概括旧上下文，再更详细记录最近进展、结论、分歧与下一步。对于声称已完成但尚未验证的工作（如工具调用返回成功但结果未人工确认），明确标注"（待验证）"——不要默认信任工具返回值。
4) 文件操作清单：列出本次压缩范围内读取、写入、编辑过的文件路径及操作类型（如: - 读取: path/to/file；若未涉及文件操作写"无"）。
5) 忽略寒暄、重复尝试和无价值废话；**已放弃的方案/尝试**可以省略，但用户当初的意图与理由不可省略（见第 2 条）。
6) 不要编造未出现的信息；不要开场白、结束语、markdown 代码块或额外章节；不要调用任何工具。`;

// --- 消息格式化 ---

/**
 * content 为空时的 fallback：用 tool_calls 函数名或占位符。
 * 提取为私有函数避免 formatMessagesForSummary 和截断版重复。
 */
function formatMessageContentFallback(msg: {
  content: unknown;
  tool_calls?: Array<{ function?: { name?: string } }>;
}): string {
  const content = serializeMessageContent(msg.content);
  if (content) return content;
  if (Array.isArray(msg.tool_calls)) {
    return `[tool_calls:${msg.tool_calls
      .map((c) => c.function?.name)
      .filter(Boolean)
      .join(",")}]`;
  }
  return "[非文本内容]";
}

/**
 * 把消息序列格式化成摘要 LLM 可读的纯文本（无截断）。
 *
 * 兼容 web Message 和 local PlanCompressionBridgeMessage。
 * tool_calls 无 content 时用函数名做 fallback 标记，避免空行。
 */
export function formatMessagesForSummary(
  msgs: Array<{
    role: string;
    content: unknown;
    tool_calls?: Array<{ function?: { name?: string } }>;
  }>,
): string {
  return formatMessagesForSummaryWithTruncation(msgs, Infinity);
}

/**
 * 构造摘要 user message 内容：现有记忆 + 文件操作清单 + 新增对话。
 *
 * 文件操作清单可选（web 端首次接入时可不传，降级为两段式输入格式）。
 */
export function buildCompactionUserContent(args: {
  previousSummary: string;
  messagesText: string;
  fileOpsText?: string;
}): string {
  const parts = [`【现有记忆】：\n${args.previousSummary || "(无)"}`];
  if (args.fileOpsText !== undefined) {
    parts.push(`【文件操作清单】：\n${args.fileOpsText || "无"}`);
  }
  parts.push(`【新增对话】：\n${args.messagesText}`);
  return parts.join("\n\n").trim();
}

// --- 文件操作提取 ---

export type FileOperation = {
  type: "read" | "write" | "edit";
  path: string;
};

/**
 * 从 tool_calls 里提取文件操作（read/write/edit）。
 *
 * 依赖调用方传入 canonicalize 后的 tool name 映射；这里只做字段提取，
 * 不耦合具体的 tool name 别名系统（web 和 local 的 tool name 可能不同）。
 */
export function extractFileOperationsFromCalls(
  calls: Array<{
    function?: { name?: string; arguments?: unknown };
    name?: string;
  }>,
  resolveCanonicalName: (name: string) => string,
): FileOperation[] {
  const result: FileOperation[] = [];
  const seen = new Set<string>();
  const fileOperationByTool: Record<string, FileOperation["type"]> = {
    readFile: "read",
    writeFile: "write",
    editFile: "edit",
  };

  for (const call of calls) {
    const rawName = call.function?.name || call.name || "";
    if (!rawName) continue;

    const canonicalName = resolveCanonicalName(rawName);
    const opType = fileOperationByTool[canonicalName];
    if (!opType) continue;

    let rawArgs = call.function?.arguments;
    let parsedArgs: Record<string, unknown> | null = null;

    if (typeof rawArgs === "string") {
      try {
        parsedArgs = JSON.parse(rawArgs);
      } catch {
        // ignore invalid JSON
      }
    } else if (typeof rawArgs === "object" && rawArgs !== null) {
      parsedArgs = rawArgs as Record<string, unknown>;
    }

    const path =
      (parsedArgs as Record<string, unknown> | null)?.path ??
      (parsedArgs as Record<string, unknown> | null)?.filePath ??
      (parsedArgs as Record<string, unknown> | null)?.file;
    if (typeof path === "string" && path.trim()) {
      const key = `${opType}:${path.trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ type: opType, path: path.trim() });
      }
    }
  }

  return result;
}

/**
 * 从消息序列里提取所有文件操作并格式化为摘要 prompt 用的文本。
 *
 * 需要调用方提供 `resolveCanonicalName` 来把可能的 tool name 别名映射到
 * readFile/writeFile/editFile，避免本模块耦合 tool alias 系统。
 */
export function formatFileOperationsFromMessages(
  msgs: Array<Record<string, any>>,
  resolveCanonicalName: (name: string) => string,
): string {
  const allOps: FileOperation[] = [];
  for (const msg of msgs) {
    if (!Array.isArray(msg.tool_calls)) continue;
    allOps.push(
      ...extractFileOperationsFromCalls(msg.tool_calls, resolveCanonicalName),
    );
  }
  if (allOps.length === 0) return "无";

  const typeLabelMap: Record<FileOperation["type"], string> = {
    read: "读取",
    write: "写入",
    edit: "编辑",
  };
  return allOps.map((op) => `- ${typeLabelMap[op.type]}: ${op.path}`).join("\n");
}

// --- 工具结果截断（P0-2，学 Pi） ---

/**
 * 单个工具结果在摘要输入里的最大字符数（普通 prose）。
 *
 * 超长的工具结果（如读取大文件）截断到这个长度并加标记，避免摘要请求本身
 * 被撑爆。取 4000 字符（约 1000 token），比 Pi 的 2000 更宽松一些，因为
 * bun-nolo 的工具结果常含文件路径和关键错误信息，截太狠会丢上下文。
 */
export const TOOL_RESULT_TRUNCATE_CHARS = 4000;

/**
 * 疑似证据行的信号（纯正则，无依赖）。
 *
 * 2026-10-06 压缩评估复评（父方向）：**总上限保持 4000 不变**，只从被截区间里
 * 挑出证据行（commit sha / 测试构建结论词 / 退出码 / HTTP 码 / 堆栈 / 测试计数）
 * 进保留集——本地压缩有 60s 总超时（localLoop.ts DEFAULT_COMPACTION_TIMEOUT_MS），
 * 提高上限会撑大压缩输入、加剧 HIGH-2 摘要膨胀螺旋。方向"宁可多留不误杀"，
 * 但这些行总量仍受 4000 约束。
 */
// 精度优先（独立审查 HIGH）：每条都要求“结构化上下文”，不认裸 hex / 裸三位数 /
// 散落的 error 单词——那些在普通文本（年份、端口、编号、叙述）里大量出现，会把
// 头尾上下文挤掉。宁可漏一条证据，不让误报改变普通输出。
const EVIDENCE_LINE_PATTERNS: readonly RegExp[] = [
  // commit sha：必须带 git 语境（commit/sha/HEAD/merge/push 输出 a..b）且含字母+数字
  /\b(?:commit|sha|HEAD|merge|revert|cherry-pick)\b[^\n]{0,24}\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/i,
  /\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7,40}\.\.(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/,
  // 测试结论：带计数的 pass/fail，或 bun/jest 风格的 (pass)/(fail) 行首
  /\b\d+\s+(?:pass|passed|fail|failed|tests?)\b/i,
  /^\s*\((?:pass|fail)\)/i,
  /^\s*(?:FAIL|PASS|ERROR)\b[:\s]/,
  // 退出码 / HTTP 状态：必须带键名
  /\bexit(?:\s*code|Code|_code)?\s*[=:]\s*\d+/i,
  /\bHTTP\/[\d.]+\s+[1-5]\d{2}\b/,
  /\b(?:status|statusCode|http_code|code)\s*[=:]\s*[1-5]\d{2}\b/i,
  // 错误：行首的 XxxError:/Exception:，或 error: 前缀；超时带 timeout 关键结构
  /^\s*(?:Uncaught\s+)?[A-Z]\w*(?:Error|Exception)\b\s*:/,
  /^\s*(?:error|fatal|panic)\s*:/i,
  /\bTimeout\s+\d+\s*ms\s+exceeded\b/i,
  // 堆栈帧
  /^\s*at\s+\S+.*:\d+(?::\d+)?\)?\s*$/,
];

/**
 * 判定单行是否为疑似证据行（纯函数，导出供测试）。
 */
export function isEvidenceLine(line: string): boolean {
  if (!line) return false;
  return EVIDENCE_LINE_PATTERNS.some((re) => re.test(line));
}

/**
 * 从候选行里按原顺序挑出证据行（纯函数，导出供测试）。
 */
export function selectEvidenceLines(lines: readonly string[]): string[] {
  return lines.filter(isEvidenceLine);
}

/**
 * 截断保留策略的预算分配（纯函数，导出供测试）：
 * 被截区间挑出的证据行、头部行、尾部行各占多少字符。
 * 头部/尾部均分、证据行拿剩余额度；单一巨型行按字符切片兜底。
 * 纯分数计算——同输入同输出，不依赖时间/随机/环境。
 */
const HEAD_SHARE = 0.4;
const TAIL_SHARE = 0.4;

export function evidenceTruncateBudget(maxChars: number): {
  markerReserve: number;
  headCap: number;
  tailCap: number;
  evidenceCap: number;
} {
  // 标记 + 「已保留 N 条证据行」备注的最坏长度预留，保证含标记的总长严格 ≤ maxChars
  const markerReserve = 96;
  const usable = Math.max(0, maxChars - markerReserve);
  const headCap = Math.floor(usable * HEAD_SHARE);
  const tailCap = Math.floor(usable * TAIL_SHARE);
  return {
    markerReserve,
    headCap,
    tailCap,
    evidenceCap: Math.max(0, usable - headCap - tailCap),
  };
}

/** 从头部按整行取到不超过 cap；首行即超 cap 时按字符切片兜底。 */
function takeHeadLines(
  lines: readonly string[],
  cap: number,
): { text: string; consumed: number } {
  let text = "";
  let consumed = 0;
  for (const line of lines) {
    const candidate = consumed === 0 ? line : `${text}\n${line}`;
    if (candidate.length > cap) {
      if (consumed === 0 && cap > 0) {
        // 首行即超 cap：字符级头部切片（保证任何输入都有头部上下文）
        return { text: line.slice(0, cap), consumed: 1 };
      }
      break;
    }
    text = candidate;
    consumed += 1;
  }
  return { text, consumed };
}

/** 从尾部按整行取到不超过 cap（takeHeadLines 的镜像）。 */
function takeTailLines(
  lines: readonly string[],
  cap: number,
): { text: string; consumed: number } {
  if (cap <= 0 || lines.length === 0) return { text: "", consumed: 0 };
  let text = "";
  let consumed = 0;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const candidate = consumed === 0 ? lines[i] : `${lines[i]}\n${text}`;
    if (candidate.length > cap) {
      if (consumed === 0) return { text: lines[i].slice(-cap), consumed: 1 };
      break;
    }
    text = candidate;
    consumed += 1;
  }
  return { text, consumed };
}

/** 确定性收缩：按「证据行 → 尾行 → 头行」的固定优先级丢整行，直到含标记总长 ≤ maxChars。 */
function shrinkToFit(
  head: string[],
  evidence: string[],
  tail: string[],
  makeMarker: (bodyChars: number) => string,
  maxChars: number,
): string {
  const joinBody = () => head.concat(evidence, tail).join("\n");
  let marker = makeMarker(joinBody().length);
  while (joinBody().length + marker.length > maxChars) {
    if (evidence.length > 0) evidence.pop();
    else if (tail.length > 0) tail.pop();
    else if (head.length > 0) head.pop();
    else break;
    marker = makeMarker(joinBody().length);
  }
  const result = joinBody() + marker;
  // 终极兜底：任何极端输入都不允许越过上限（正常路径不应到达）
  return result.length > maxChars ? result.slice(0, maxChars) : result;
}

/**
 * 截断消息的 content 用于摘要输入。
 *
 * 只对 role=tool 的消息截断（工具结果通常最大）；其他消息原样返回。
 *
 * 2026-10-06 压缩评估复评后改版（父方向，覆盖原"提高证据型上限"方案）：
 * **总上限仍是 4000 不变**——本地压缩有 60s 总超时（localLoop.ts
 * DEFAULT_COMPACTION_TIMEOUT_MS，压缩超时会阻止用户消息提交），且"工具结果
 * 不截断/放大"正是 docs/plans/2026-08-16-compaction-research.md 列为 HIGH-2 的
 * 摘要膨胀螺旋。只改"截掉什么"：超长且被截区间含证据行（sha / pass / fail /
 * error / timeout / exitCode / HTTP 码 / 堆栈）时，在 4000 预算内保留
 * 头部行 + 尾部行 + 证据行，其余丢弃；无证据行的普通 prose 维持旧的头部硬切
 * 行为（逐字节一致）。截断标记格式不变：[... N chars truncated ...]；保留
 * 证据行时附一行 [... 已保留 N 条证据行 ...]。输出长度严格 ≤ maxChars（含标记），
 * 纯函数、无时间/随机依赖，同输入同输出。
 */
export function truncateContentForSummary(
  role: string,
  content: string,
  maxChars: number = TOOL_RESULT_TRUNCATE_CHARS,
): string {
  if (role !== "tool" || content.length <= maxChars) return content;

  const lines = content.split("\n");
  const budget = evidenceTruncateBudget(maxChars);
  const head = takeHeadLines(lines, budget.headCap);
  const tail = takeTailLines(
    lines.slice(0, lines.length - head.consumed),
    budget.tailCap,
  );
  const middle = lines.slice(head.consumed, lines.length - tail.consumed);
  const evidence = selectEvidenceLines(middle);

  // 无证据行：维持旧行为——头部硬切到 maxChars + 原格式标记
  if (evidence.length === 0) {
    return `${content.slice(0, maxChars)}\n\n[... ${content.length - maxChars} chars truncated ...]`;
  }

  const headLines = head.text ? head.text.split("\n") : [];
  const tailLines = tail.text ? tail.text.split("\n") : [];
  const evidenceLines: string[] = [];
  let evidenceUsed = 0;
  for (const line of evidence) {
    if (evidenceUsed + line.length > budget.evidenceCap) break;
    evidenceLines.push(line);
    evidenceUsed += line.length;
  }
  const marker = (bodyChars: number) => {
    // 备注按收缩后的实际保留条数走，杜绝"已保留 0 条"这类不实标注
    const note =
      evidenceLines.length > 0
        ? `\n[... 已保留 ${evidenceLines.length} 条证据行 ...]`
        : "";
    return `\n\n[... ${content.length - bodyChars} chars truncated ...]${note}`;
  };
  return shrinkToFit(headLines, evidenceLines, tailLines, marker, maxChars);
}

/**
 * 带截断的消息格式化：先截断工具结果，再格式化。
 *
 * 这是 formatMessagesForSummary 的截断增强版，用于实际压缩调用。
 * 显式传 maxToolResultChars 时按旧契约整组覆盖（无调用方使用）。
 */
export function formatMessagesForSummaryWithTruncation(
  msgs: Array<{
    role: string;
    content: unknown;
    tool_calls?: Array<{ function?: { name?: string } }>;
  }>,
  maxToolResultChars: number = TOOL_RESULT_TRUNCATE_CHARS,
): string {
  return msgs
    .map((msg) => {
      const rawContent = serializeMessageContent(msg.content) || "";
      const truncated = truncateContentForSummary(
        msg.role,
        rawContent,
        maxToolResultChars,
      );
      const text = truncated || formatMessageContentFallback(msg);
      return `${msg.role}: ${text}`;
    })
    .join("\n");
}
// --- 压缩埋点 metrics (P1-8) ---

/**
 * 一次压缩事件的 metrics 记录。
 *
 * 用于观测压缩效果和成本：压缩前后 token 对比能看出压缩收益，
 * 摘要 LLM 用量能算出压缩本身的成本，触发原因能指导阈值调优。
 */
export interface CompactionMetrics {
  /** 触发原因 */
  reason: string;
  /** 压缩前已有 summary 的 token 数 */
  previousSummaryTokens: number;
  /** 被压缩消息的 token 数 */
  compressedTokens: number;
  /** 保留尾部消息的 token 数 */
  retainedTokens: number;
  /** 新 summary 的 token 数（压缩后） */
  newSummaryTokens: number;
  /** 被压缩消息数 */
  compressedCount: number;
  /** 保留尾部消息数 */
  retainedCount: number;
  /** 摘要 LLM 调用的 usage（如果有） */
  summaryUsage?: Record<string, unknown>;
  /** 是否有前序摘要（用于判断首次压缩 vs 增量压缩） */
  hadPreviousSummary: boolean;
}

/**
 * 构造压缩 metrics 记录。纯函数：不调 LLM、不写 DB。
 */
export function buildCompactionMetrics(args: {
  reason: string;
  previousSummary: string;
  msgsToCompress: TokenCountableMessage[];
  msgsToKeep: TokenCountableMessage[];
  newSummary: string;
  summaryUsage?: Record<string, unknown>;
  estimateTokens: (text: string) => number;
  estimateMessageTokens: (msg: TokenCountableMessage) => number;
}): CompactionMetrics {
  const {
    reason, previousSummary, msgsToCompress, msgsToKeep,
    newSummary, summaryUsage, estimateTokens, estimateMessageTokens,
  } = args;
  return {
    reason,
    previousSummaryTokens: estimateTokens(previousSummary || ""),
    compressedTokens: msgsToCompress.reduce((s, m) => s + estimateMessageTokens(m), 0),
    retainedTokens: msgsToKeep.reduce((s, m) => s + estimateMessageTokens(m), 0),
    newSummaryTokens: estimateTokens(newSummary || ""),
    compressedCount: msgsToCompress.length,
    retainedCount: msgsToKeep.length,
    summaryUsage,
    hadPreviousSummary: previousSummary.trim().length > 0,
  };
}

/**
 * 从 CompressionPlan 构造 metrics 的便捷函数。
 *
 * 三套压缩路径（web / local / CLI）都用 planCompression 做决策，
 * 调用方只需传 plan + reason + newSummary + 可选 summaryUsage，
 * 不用每次都手动传 estimateTokens / estimateMessageTokens。
 */
export function buildCompactionMetricsFromPlan(args: {
  reason: string;
  previousSummary: string;
  plan: { msgsToCompress: TokenCountableMessage[]; msgsToKeep: TokenCountableMessage[] };
  newSummary: string;
  summaryUsage?: Record<string, unknown>;
}): CompactionMetrics {
  return buildCompactionMetrics({
    reason: args.reason,
    previousSummary: args.previousSummary,
    msgsToCompress: args.plan.msgsToCompress,
    msgsToKeep: args.plan.msgsToKeep,
    newSummary: args.newSummary,
    summaryUsage: args.summaryUsage,
    estimateTokens: estimateTokenCount,
    estimateMessageTokens: getMessageTokenCount,
  });
}

/**
 * 格式化成人类可读的单行日志。
 * 示例: [Compaction] reason=context_budget compressed=15->2 msgs, tokens=12500->3200 (ratio=0.26)
 */
export function formatCompactionMetricsLog(metrics: CompactionMetrics): string {
  const totalBefore = metrics.previousSummaryTokens + metrics.compressedTokens;
  const totalAfter = metrics.newSummaryTokens + metrics.retainedTokens;
  const ratio = totalBefore > 0 ? (totalAfter / totalBefore).toFixed(2) : "N/A";
  const llmInfo = metrics.summaryUsage
    ? `, summary_llm_in=${metrics.summaryUsage.input_tokens ?? "?"} out=${metrics.summaryUsage.output_tokens ?? "?"}`
    : "";
  return `[Compaction] reason=${metrics.reason} compressed=${metrics.compressedCount}->${metrics.retainedCount} msgs, tokens=${totalBefore}->${totalAfter} (ratio=${ratio})${llmInfo}`;
}
