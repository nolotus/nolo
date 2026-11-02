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
