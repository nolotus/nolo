/**
 * AGENTS.md 工作区指令读取（三 host 共享的唯一实现）。
 *
 * TUI（tuiTurnRunner）、CLI（agentRunCommand）、desktop
 * （desktopAgentRuntimeTurnService）此前各手写一份：同样的
 * AGENTS.md → CLAUDE.md 回退、同样的 8KB 截断、同样的 marker。
 * 手写副本必然漂移，此处收敛为单一实现。
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildAgentsMdLayer, buildAgentsMdLayerHeader, type TurnContextLayer } from "./turnContext";

/**
 * 注入预算（字节）：正文 + 截断 marker 合计不得超过此值。
 * marker 也占预算——否则「按 8KB 截断正文再追加 marker」会让实际注入
 * 超出预算几十到几百字节。
 */
export const AGENTS_MD_MAX_BYTES = 8192;
/**
 * 截断 marker 的预留字节。marker 单独占预算，正文预算因此固定
 * （MAX - RESERVE - 2），不受 marker 实际长度影响——否则「原文件字节数」
 * 这类位数会变的字段会让正文长度随文件而变，同前缀不同长度的文件截断后
 * 正文不再可比。
 */
const AGENTS_MD_MARKER_RESERVE_BYTES = 512;
export const AGENTS_MD_CANDIDATES = ["AGENTS.md", "CLAUDE.md"] as const;

/**
 * 在字节上限内安全截断 UTF-8 文本：
 * 1. 优先按行边界回退到不超过上限的最后一行（保留换行结构完整）；
 * 2. 无行边界可用时（如单行超长），回退到最近的合法 UTF-8 字符边界。
 *
 * 行边界回退只在不至于丢掉大量正文时采用——保留量不足字符边界的一半时
 * 改用字符边界截断；此时正文末尾可能是半行，但绝不会切出半个 UTF-8 字符。
 *
 * 字符边界用**字节层面**判定（continuation byte: 0b10xxxxxx），不扫描解码后的
 * U+FFFD——文件正文里本来就可能存在合法的 `�`，按替换字符判断会误伤正文。
 */
export function truncateAgentsMdContent(
  content: string,
  maxBytes = AGENTS_MD_MAX_BYTES,
): string {
  const buf = Buffer.from(content, "utf8");
  if (buf.byteLength <= maxBytes) {
    return content;
  }

  // 字符边界：截断点落在字符中间时回退。判断依据是**被排除的第一个字节**
  // buf[end]：它是 continuation byte（0b10xxxxxx）说明截断点落在字符中间，
  // 需要继续回退；buf[end-1] 是 continuation byte 则说明该字符被完整包含。
  let boundary = Math.min(maxBytes, buf.byteLength);
  while (boundary > 0 && boundary < buf.byteLength && (buf[boundary] & 0xc0) === 0x80) {
    boundary--;
  }
  const boundarySlice = buf.subarray(0, boundary).toString("utf8");

  // 行边界：优先保留到不超过上限的最后一行。UTF-8 多字节序列不含 0x0A，
  // 因此切到换行符之前一定是完整字符，无需再做替换字符检查。
  const slice = buf.subarray(0, maxBytes);
  const lastNewline = slice.lastIndexOf(0x0a);
  if (lastNewline > 0) {
    const lineCandidate = slice.subarray(0, lastNewline).toString("utf8");
    // 只有当整行回退不至于丢掉大量正文时才用它：短标题后接超长规则段时，
    // 按行回退可能只剩几个字节，而按字符边界能保留几乎全部预算。
    const lineBytes = Buffer.byteLength(lineCandidate, "utf8");
    const boundaryBytes = Buffer.byteLength(boundarySlice, "utf8");
    if (lineCandidate.trim().length > 0 && lineBytes * 2 >= boundaryBytes) {
      return lineCandidate.replace(/\r$/, "");
    }
  }

  return boundarySlice.replace(/\r$/, "");
}

/**
 * 常驻摘要的字节预算（含块头部）：超预算文件不再截断注入正文，而是注入
 * 「关键词索引 + 完整文件路径」，模型按需 readFile 读全文。
 *
 * 为什么不是「截断比例」而是「摘要」：截断注入的尾部内容随文件长度漂移，
 * 模型看到的是一段**看似完整**的规则文本，缺的部分没有任何信号；摘要则显式
 * 声明「本层只有索引」，把「读全文」变成可执行的下一步。
 */
export const AGENTS_MD_SUMMARY_MAX_BYTES = 3072;
/** 单条索引保留的首句字符上限（按字符切，避免切出半个 UTF-8 字符）。 */
export const AGENTS_MD_SUMMARY_ITEM_MAX_CHARS = 120;

/**
 * 索引条目优先级关键词：命中越靠前越先占用摘要预算。
 *
 * 摘要预算装不下全部锚点，因此**先保硬门**——提交/评审门禁、worktree 隔离、
 * 测试与 typecheck 命令、文档落位、删除红线、发布纪律。其余条目按文件顺序
 * 占用剩余预算，被丢弃时摘要末尾会显式说明「索引已截断」。
 */
const AGENTS_MD_SUMMARY_PRIORITY_KEYWORDS: readonly string[] = [
  "review",
  "评审",
  "commit",
  "提交",
  "worktree",
  "测试",
  "typecheck",
  "类型检查",
  "push",
  "发布",
  "文档落位",
  "删除",
  "派发",
];

/**
 * 摘要固定指令段：告诉模型「这是索引、不是规则全文」，并点名必须先读全文的
 * 场景。缺了这段摘要就退化成「一份看起来完整的短规则」，比不注入更危险。
 */
const AGENTS_MD_SUMMARY_POINTER_INSTRUCTION =
  "用 readFile 读全文：%REL%（cwd）/ %PATH%\n" +
  "仅索引：提交/评审门禁、worktree 隔离、测试/typecheck、文档落位、删除、push/发布前，" +
  "**必须先 readFile 读全文再执行**。\n" +
  "路径：%REL% 相对 cwd；machine:<id>/沙盒执行面 cwd 由其决定，读不到让宿主注入或用绝对路径。";

/**
 * 固定的删除红线引用：仓库 AGENTS.md 可能把删除规则写在任意位置，摘要也可能
 * 因预算丢弃那一条，因此这条引用无条件占据摘要预算（内容真值仍在系统提示词的
 * 删除红线块与仓库全文中，此处只保证入口不丢）。
 */
const AGENTS_MD_SUMMARY_DELETE_REFERENCE =
  "- 删除/不可逆操作：遵守系统提示的删除红线（先呈现完整待删清单并获用户明确确认，" +
  "禁止先删后报、禁止模糊定位），仓库若有附加删除规则见完整文件。";

type AgentsMdSummaryItem = {
  /** 所属 `##` 小节标题（无小节时为 null）。 */
  section: string | null;
  /** 条目标签（`- **xxx**：` 的粗体部分，或首个分句）。 */
  label: string;
  /** 条目首句（可能被截断到 ITEM_MAX_CHARS）。 */
  gist: string;
  /** 优先级关键词命中位置（用于排序，-1 表示未命中）。 */
  priority: number;
};

const clipToChars = (text: string, maxChars: number): string =>
  text.length <= maxChars ? text : `${text.slice(0, maxChars).trimEnd()}…`;

/** 从一条 `- ...` 列表项解析出「标签 + 首句」。 */
const parseAgentsMdItem = (body: string): { label: string; rest: string } => {
  const bold = /^\*\*(.+?)\*\*/.exec(body);
  if (bold) {
    return {
      label: bold[1].trim().replace(/[：:]$/, ""),
      rest: body.slice(bold[0].length).replace(/^[：:\s]+/, ""),
    };
  }
  const firstClause = body.split(/[：:]/)[0];
  return {
    label: clipToChars(firstClause.trim(), 40),
    rest: body.slice(firstClause.length).replace(/^[：:\s]+/, ""),
  };
};

const priorityOf = (label: string): number => {
  const lowered = label.toLowerCase();
  for (let i = 0; i < AGENTS_MD_SUMMARY_PRIORITY_KEYWORDS.length; i += 1) {
    if (lowered.includes(AGENTS_MD_SUMMARY_PRIORITY_KEYWORDS[i].toLowerCase())) {
      return i;
    }
  }
  return -1;
};

/** 从 AGENTS.md 正文提取索引条目（按文件顺序）。 */
const collectAgentsMdSummaryItems = (content: string): AgentsMdSummaryItem[] => {
  const items: AgentsMdSummaryItem[] = [];
  const seen = new Set<string>();
  let section: string | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = /^#{2,3}\s+(.+)$/.exec(line);
    if (heading) {
      section = heading[1].trim();
      continue;
    }
    // 跳过 # 一级标题与 HTML 注释/标签行
    if (line.startsWith("#") || line.startsWith("<") || line.startsWith("<!--")) {
      continue;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (!bullet) continue;

    const { label, rest } = parseAgentsMdItem(bullet[1]);
    if (!label || seen.has(label)) continue;
    seen.add(label);

    // 首句按 `。` 切（不按 `；`）：硬门的判定条件常常就写在第一个句子的
    // 分号之间（如「reviewer 与执行者不同实例；APPROVE 且无 CRITICAL/HIGH 才提交」），
    // 按分号切会把可执行条件削成一句空话。
    const firstSentence = rest.split("。")[0].trim();
    items.push({
      section,
      label,
      gist: clipToChars(firstSentence, AGENTS_MD_SUMMARY_ITEM_MAX_CHARS),
      priority: priorityOf(label),
    });
  }

  return items;
};

/**
 * 生成「按需加载」摘要正文（不含块头部）：固定说明段 + 删除红线引用 + 关键词索引。
 *
 * `budgetBytes` 是**正文**预算（调用方已扣除块头部）。索引条目先按硬门优先级
 * 占用预算，再按文件顺序填充；任一条装不下即停止，并追加截断说明，保证
 * 返回值按字节计量永不超过预算。
 */
export function buildAgentsMdSummaryBody(
  content: string,
  filePath: string,
  options: { budgetBytes?: number; fileName?: string } = {},
): string | null {
  const budgetBytes = options.budgetBytes ?? AGENTS_MD_SUMMARY_MAX_BYTES;
  const items = collectAgentsMdSummaryItems(content);
  if (items.length === 0) return null;

  // 相对路径与绝对路径都给，但**都不承诺可达**：host 读盘位置与子 run 执行面
  // （machine:<id> / 沙盒）可能不同。%REL% 只是「按当前工作目录解析」的短名
  // （= AGENTS.md 候选文件名）；沙盒执行面 fail-closed、不兑现宿主 cwd
  // （dispatchBackendPolicy.ts:5；fail-closed 实现在 dockerSandboxExecutionBackend.ts:807），因此读不到
  // 宿主仓库时须由宿主侧注入内容，或改用宿主绝对路径。
  const relativePath = options.fileName ?? "AGENTS.md";
  // replaceAll：说明段里 %REL% 出现两次（读取入口 + 子 run 沙盒提示），
  // 只替换首个会让模型读到未展开的占位符
  const pointer = AGENTS_MD_SUMMARY_POINTER_INSTRUCTION.replaceAll(
    "%REL%",
    relativePath,
  ).replaceAll("%PATH%", filePath);
  const head = `${pointer}\n${AGENTS_MD_SUMMARY_DELETE_REFERENCE}\n`;
  if (Buffer.byteLength(head, "utf8") > budgetBytes) return null;

  // 装填分两趟，**跨小节**生效：第一趟按 priority 全局升序装所有命中硬门关键词的
  // 条目，第二趟再按文件顺序补其余条目。这样硬门占用预算与它在文件里的位置无关——
  // 前置大段无关小节不会再花光预算、把后面的「## 核心硬门」整节挤掉。
  const candidates: AgentsMdSummaryItem[] = [
    ...items
      .filter((item) => item.priority >= 0)
      .sort((a, b) => a.priority - b.priority),
    ...items.filter((item) => item.priority < 0),
  ];

  const note = "…（索引已截断，其余锚点见完整文件）";
  const noteBytes = Buffer.byteLength(note, "utf8");
  // 截断说明随时可能追加，因此始终为它预留预算（宁可少装一条，也不超预算）
  let used = Buffer.byteLength(head, "utf8");
  const admitted: AgentsMdSummaryItem[] = [];
  const seenSections = new Set<string | null>();
  let truncated = false;

  for (const item of candidates) {
    const line = item.gist ? `- ${item.label}：${item.gist}` : `- ${item.label}`;
    const headingCost =
      item.section && !seenSections.has(item.section)
        ? Buffer.byteLength(`\n## ${item.section}`, "utf8")
        : 0;
    const cost = headingCost + Buffer.byteLength(`\n${line}`, "utf8");
    // 装不下就跳过这一条（继续看后面的短条目），并标记索引已截断
    if (used + cost + noteBytes > budgetBytes) {
      truncated = true;
      continue;
    }
    used += cost;
    if (item.section) seenSections.add(item.section);
    admitted.push(item);
  }

  // 渲染时按小节聚合（小节顺序 = 该小节第一条被采纳条目的顺序），标题只出一次
  const groupOrder: (string | null)[] = [];
  for (const item of admitted) {
    if (!groupOrder.includes(item.section)) groupOrder.push(item.section);
  }
  const frozen: { section: string | null; line: string }[] = [];
  for (const section of groupOrder) {
    for (const item of admitted) {
      if (item.section !== section) continue;
      frozen.push({
        section,
        line: item.gist ? `- ${item.label}：${item.gist}` : `- ${item.label}`,
      });
    }
  }

  // 一条都装不下时退回 null，让调用方走截断路径，而不是只给一句「已截断」
  if (admitted.length === 0) return null;

  return `${head}${renderSummarySections(frozen)}${truncated ? `\n${note}` : ""}`;
}

/** 按小节聚合渲染，小节标题只在首次出现时输出一次。 */
const renderSummarySections = (
  entries: ReadonlyArray<{ section: string | null; line: string }>,
): string => {
  let rendered = "";
  let currentSection: string | null = null;
  for (const entry of entries) {
    if (entry.section && entry.section !== currentSection) {
      rendered += `\n## ${entry.section}`;
      currentSection = entry.section;
    }
    rendered += `\n${entry.line}`;
  }
  return rendered;
};

/**
 * 从工作区根目录读取 AGENTS.md（缺失时回退 CLAUDE.md），返回 canonical
 * agents-md layer（session-scope）；都不存在或不可读时返回 null。
 *
 * 超过注入预算时截断正文，并追加结构化 marker：原文件字节数、已省略字节数、
 * 完整文件绝对路径，以及「提交/评审前请读完整文件」的门禁提醒。
 * 「已省略字节数」按**实际未注入的字节**计算（原文件总字节 - 实际注入正文
 * 字节），因此行边界回退多丢的那部分也计入，不会少报。
 */
export function readAgentsMdLayerFromDisk(cwd: string): TurnContextLayer | null {
  for (const name of AGENTS_MD_CANDIDATES) {
    const filePath = resolve(cwd, name);
    if (!existsSync(filePath)) continue;
    try {
      const raw = readFileSync(filePath, "utf8");
      const content = raw.trim();
      if (!content) continue;

      const totalBytes = Buffer.byteLength(raw, "utf8");
      const trimmedBytes = Buffer.byteLength(content, "utf8");
      // 注入块头部也占预算：正文按预算截断后再拼头部会超出上限
      const headerBytes = Buffer.byteLength(buildAgentsMdLayerHeader(name), "utf8");

      if (headerBytes + trimmedBytes <= AGENTS_MD_MAX_BYTES) {
        return buildAgentsMdLayer(content, name);
      }

      // 超预算：不再截断注入正文（截断会让模型看到一段「看似完整」的规则文本），
      // 改为注入精简索引 + 完整文件绝对路径，模型按需 readFile 读全文。
      const summaryBody = buildAgentsMdSummaryBody(content, filePath, {
        // 正文预算 = 摘要上限 − 块头部：buildAgentsMdLayer 会再拼一次头部，
        // 因此「头部 + 正文」才等于最终注入字节，不得超过摘要上限。
        budgetBytes: AGENTS_MD_SUMMARY_MAX_BYTES - headerBytes,
        fileName: name,
      });
      if (summaryBody) return buildAgentsMdLayer(summaryBody, name);

      // 无可索引结构（例如单行长文本、纯代码块）：退回截断路径，避免完全失去内容。
      const buildMarker = (omitted: number, withPath: boolean): string => {
        const pathPart = withPath
          ? `完整文件：${filePath}`
          : `完整文件：工作区根目录的 ${name}`;
        return `<!-- AGENTS.md truncated: 原文件 ${totalBytes} 字节，注入预算 ${AGENTS_MD_MAX_BYTES} 字节，已省略 ${omitted} 字节（上文可能缺少文件末尾的 commit/review 门禁细则，提交/评审前请读完整文件）。${pathPart} -->`;
      };

      // 正文预算固定：marker 单独占预留字节，正文长度因此与 marker 实际长度无关。
      // 头部字节也要从正文预算里扣掉，保证「头部 + 正文 + 分隔 + marker」不超上限。
      const bodyBudget =
        AGENTS_MD_MAX_BYTES - AGENTS_MD_MARKER_RESERVE_BYTES - 2 - headerBytes;
      const body = truncateAgentsMdContent(content, bodyBudget);
      const bodyBytes = Buffer.byteLength(body, "utf8");
      const omitted = Math.max(0, totalBytes - bodyBytes);

      let marker = buildMarker(omitted, true);
      if (Buffer.byteLength(marker, "utf8") > AGENTS_MD_MARKER_RESERVE_BYTES) {
        // 路径过长导致 marker 超出预留：退化为不含路径的短 marker
        marker = buildMarker(omitted, false);
      }

      return buildAgentsMdLayer(`${body}\n\n${marker}`, name);
    } catch {
      /* skip unreadable */
    }
  }
  return null;
}
