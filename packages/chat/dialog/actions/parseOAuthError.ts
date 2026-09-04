// packages/chat/dialog/actions/parseOAuthError.ts
//
// 把 provider 发送失败 / 网络失败的错误文本结构化解析成用户可读、可操作的消息。
//
// 归因与文案原则：
// - 发送失败大多是瞬时故障（网络抖动/连接被掐/服务端瞬断），硬性禁止断言是用户网络问题。
// - 瞬时类（timeout/连接中断/5xx/无法归因的网络层错误）统一使用中性表述（如「连接中断：可能是网络波动或服务端瞬时问题，点击重试通常可恢复」）。
// - 只有明确判定为本地服务拒绝连接（ECONNREFUSED 127.0.0.1）时才提示检查本地服务。
// - 若底层 fetch 错误带 cause（Node/Bun 的 fetch failed cause），把真实原因（如 ECONNRESET）透出到 fallbackText。
// - 能判定环节时标注 stage（desktop_local_runtime | server_proxy | provider | client_fetch），判定不了不断言。
// - URL scheme 安全白名单：仅放行 http/https，过滤危险 scheme。
// - 未明确映射 HTTP 状态（如 404/408/409/413/422）仅命中 providerMatch 不误判 auth，回退 unknown 且保持可重试。

import type { SendErrorKind, SendErrorStage } from "../../messages/types";

export type { SendErrorKind, SendErrorStage };

export type ParsedSendError = {
  /** 错误分类 */
  kind: SendErrorKind;
  /** 是否可手动/自动重试 */
  retryable: boolean;
  /** 发生故障的调用环节（若能判定） */
  stage?: SendErrorStage | string;
  /** 建议用户采取的动作提示 */
  actionHint?: string;
  /** 错误摘要（HTTP 状态 + provider 可读名），无原始 JSON dump */
  summary: string;
  /** Google 风格验证链接（若有） */
  validationUrl?: string;
  /** 验证链接的展示文案（Google 提供，如 "Verify your account"） */
  validationLinkText?: string;
  /** 附加辅助链接（如 Learn more） */
  extraLinks: Array<{ text: string; url: string }>;
  /** 若无法结构化解析，回退为原文（包含 cause 链） */
  fallbackText?: string;
};

const PROVIDER_NAMES: Record<string, string> = {
  antigravity: "Antigravity (Google)",
  claude: "Claude",
  chatgpt: "ChatGPT",
  xai: "xAI Grok",
  cursor: "Cursor",
  cloudflare: "Cloudflare",
};

/** 尝试把任意值解析为对象，失败返回 null */
function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** 仅放行安全的 http/https URL scheme，丢弃 javascript: 等不安全链接 */
export function sanitizeSafeUrl(rawUrl: unknown): string | undefined {
  if (typeof rawUrl !== "string") return undefined;
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return trimmed;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** 展开包含 cause 链的完整错误文本 */
export function extractFullErrorText(error: unknown): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    let msg = error.message || error.name || String(error);
    const seen = new Set<unknown>([error]);
    let current: any = (error as any).cause;
    while (current && !seen.has(current)) {
      seen.add(current);
      const causeMsg =
        current instanceof Error
          ? current.message || String(current)
          : typeof current === "string"
          ? current
          : JSON.stringify(current);
      if (causeMsg && !msg.includes(causeMsg)) {
        msg = `${msg}\n[cause]: ${causeMsg}`;
      }
      current = current?.cause;
    }
    return msg;
  }
  return (error as any)?.message || (error as any)?.error || String(error);
}

/** 从 Google ErrorInfo details[].metadata 里收集验证链接 */
function collectValidationFromDetails(
  details: unknown
): { url?: string; text?: string; learnMoreUrl?: string } {
  if (!Array.isArray(details)) return {};
  let url: string | undefined;
  let text: string | undefined;
  let learnMoreUrl: string | undefined;
  for (const detail of details) {
    const rec = asRecord(detail);
    if (!rec) continue;
    const metadata = asRecord(rec.metadata);
    if (metadata) {
      url = url ?? sanitizeSafeUrl(metadata.validation_url);
      text = text ?? asString(metadata.validation_url_link_text);
      learnMoreUrl = learnMoreUrl ?? sanitizeSafeUrl(metadata.validation_learn_more_url);
    }
    const help = asRecord(rec) as Record<string, unknown> & { links?: unknown };
    if (Array.isArray(help.links)) {
      for (const link of help.links) {
        const linkRec = asRecord(link);
        if (!linkRec) continue;
        const linkUrl = sanitizeSafeUrl(linkRec.url);
        if (!linkUrl) continue;
        const desc = asString(linkRec.description);
        if (!url && desc && /verify|continue/i.test(desc)) {
          url = linkUrl;
          text = desc;
        } else if (!learnMoreUrl && /learn more/i.test(desc ?? "")) {
          learnMoreUrl = linkUrl;
        }
      }
    }
  }
  return { url, text, learnMoreUrl };
}

/** 判定故障发生阶段（stage） */
function resolveErrorStage(errorText: string): SendErrorStage | undefined {
  if (
    /127\.0\.0\.1:3233|localhost:3233|desktop daemon|desktop agent runtime|runDesktopAgentRuntime|Local turn stream/i.test(
      errorText
    )
  ) {
    return "desktop_local_runtime";
  }
  if (
    /\/api\/ai\/chat\/proxy|server proxy|core_draining|fetchWithServerProxy/i.test(
      errorText
    )
  ) {
    return "server_proxy";
  }
  if (
    /OAuth provider failed|provider failed|antigravity|claude|chatgpt|openai|gemini|deepseek/i.test(
      errorText
    )
  ) {
    return "provider";
  }
  return undefined;
}

/**
 * 主解析入口。errorInput 支持 Error 对象（带 cause 链）或错误文本：
 *   `local Antigravity OAuth provider failed: HTTP 403 {"error":{...}}`
 *   `TypeError: fetch failed (cause: Error: connect ECONNRESET)`
 *   `The operation was aborted due to timeout`
 */
export function parseSendError(errorInput: unknown): ParsedSendError {
  const fullErrorText = extractFullErrorText(errorInput).trim();
  const firstLine = fullErrorText
    .replace(/^local\s+/, "")
    .split("\n")[0]
    .trim();

  // 提取 provider 名与 HTTP 状态
  const providerMatch = fullErrorText.match(/local\s+(\w+)\s+OAuth provider failed/i);
  const providerName = providerMatch
    ? PROVIDER_NAMES[providerMatch[1].toLowerCase()] ?? providerMatch[1]
    : undefined;
  const statusMatch =
    fullErrorText.match(/HTTP\s+(\d{3})/i) ||
    fullErrorText.match(/\bstatus(?:\s+code)?[:=]?\s*(\d{3})\b/i) ||
    fullErrorText.match(/^(?:HTTP\/[\d.]+\s+)?([45]\d{2})\b/i);
  const status = statusMatch?.[1];
  const statusCode = status ? parseInt(status, 10) : undefined;

  // 提取 JSON 部分（HTTP xxx 之后）
  const jsonStart = fullErrorText.indexOf("{");
  let payload: unknown = null;
  if (jsonStart >= 0) {
    let candidate = fullErrorText.slice(jsonStart);
    for (let depth = 0; depth < 3; depth += 1) {
      try {
        const parsed = JSON.parse(candidate);
        payload = parsed;
        const message = asString(
          (parsed as Record<string, any>)?.error?.message ??
            (parsed as Record<string, any>)?.message
        );
        if (message && message.trim().startsWith("{")) {
          candidate = message;
          continue;
        }
        break;
      } catch {
        break;
      }
    }
  }

  const errorRec = payload ? asRecord((payload as Record<string, unknown>).error) : null;
  const innerMessage = errorRec ? asString(errorRec.message) : undefined;
  const statusFromBody = errorRec ? asString(errorRec.status) : undefined;
  const details = errorRec?.details;
  const { url, text, learnMoreUrl } = collectValidationFromDetails(details);

  // reason/domain 在 details[0]（google.rpc.ErrorInfo）里，而非 error 顶层
  let reason = errorRec ? asString(errorRec.reason) : undefined;
  let domain = errorRec ? asString(errorRec.domain) : undefined;
  if (!reason && Array.isArray(details)) {
    const first = asRecord(details[0]);
    reason = first ? asString(first.reason) : undefined;
    domain = first ? asString(first.domain) : undefined;
  }

  const stage = resolveErrorStage(fullErrorText);

  // 判断错误分类 (kind) 与可重试属性 (retryable)
  let kind: SendErrorKind = "unknown";
  let retryable = true; // 默认允许重试（未知网络/普通错误给用户手动重试路径）

  const isLocalConnRefused =
    /ECONNREFUSED/i.test(fullErrorText) &&
    (/127\.0\.0\.1/i.test(fullErrorText) || /localhost/i.test(fullErrorText));

  const hasExplicitAuthKeywords =
    /unauthorized|unauthenticated|permission_denied|validation_required|invalid_api_key|api key not found|authentication error|forbidden/i.test(
      fullErrorText
    );

  if (statusCode === 429) {
    kind = "rate_limit";
    retryable = true;
  } else if (statusCode === 401 || statusCode === 403 || hasExplicitAuthKeywords) {
    kind = "auth";
    retryable = false;
  } else if (statusCode && statusCode >= 500 && statusCode < 600) {
    kind = "server";
    retryable = true;
  } else if (
    /timed out|timeout|ETIMEDOUT|deadline exceeded|upstream request timeout/i.test(
      fullErrorText
    ) ||
    /aborted due to timeout/i.test(fullErrorText)
  ) {
    kind = "timeout";
    retryable = true;
  } else if (
    /failed to fetch|network error|fetch failed|load failed|network request failed|networkerror|ECONNREFUSED|ENOTFOUND|ECONNRESET|EHOSTUNREACH|ENETUNREACH|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT|UND_ERR_SOCKET|socket hang up|socket closed|connection closed|certificate|handshake/i.test(
      fullErrorText
    )
  ) {
    kind = "network";
    retryable = true;
  } else if (
    /rate limit|too many requests|quota exceeded|resource exhausted|insufficient_quota/i.test(
      fullErrorText
    )
  ) {
    kind = "rate_limit";
    retryable = true;
  } else if (
    /internal server error|bad gateway|service unavailable|gateway timeout|core_draining/i.test(
      fullErrorText
    )
  ) {
    kind = "server";
    retryable = true;
  } else {
    // 404/408/409/413/422 等未识别状态码或纯 providerMatch 命中，回退 unknown 且保持可重试
    kind = "unknown";
    retryable = true;
  }

  // 组装可读摘要（中性表述）
  const parts: string[] = [];
  if (providerName) {
    const head = `${providerName} 连接失败`;
    parts.push(
      `${head}${status ? ` (HTTP ${status})` : ""}${
        statusFromBody ? ` ${statusFromBody}` : ""
      }`
    );
  } else {
    switch (kind) {
      case "network":
        if (isLocalConnRefused) {
          parts.push("本地服务连接失败");
        } else if (/ENOTFOUND/i.test(fullErrorText)) {
          parts.push("域名解析失败");
        } else {
          parts.push("连接中断");
        }
        break;
      case "timeout":
        parts.push("请求超时");
        break;
      case "rate_limit":
        parts.push(`请求过于频繁${status ? ` (HTTP ${status})` : ""}`);
        break;
      case "auth":
        parts.push(`认证或权限校验失败${status ? ` (HTTP ${status})` : ""}`);
        break;
      case "server":
        parts.push(`服务暂时不可用${status ? ` (HTTP ${status})` : ""}`);
        break;
      default:
        parts.push(firstLine.length > 0 ? firstLine : "发送遇到异常");
        break;
    }
  }

  if (reason) {
    parts.push(`原因：${reason}`);
  }
  if (domain) {
    parts.push(`服务：${domain}`);
  }
  const humanMessage =
    innerMessage && innerMessage.trim() !== "Verify your account to continue."
      ? innerMessage
      : undefined;
  if (humanMessage) {
    parts.push(`提示：${humanMessage}`);
  }

  // 建议动作（中性、不断言用户网络）
  let actionHint: string | undefined;
  if (url) {
    actionHint = "请点击链接完成验证";
  } else {
    switch (kind) {
      case "network":
        if (isLocalConnRefused) {
          actionHint = "无法连接到本地服务，请确认桌面端后台服务正在运行后重试";
        } else if (/ENOTFOUND/i.test(fullErrorText)) {
          actionHint = "无法解析服务地址，可能是 DNS 或网络环境波动，点击重试通常可恢复";
        } else {
          actionHint = "可能是网络波动或服务端瞬时问题，点击重试通常可恢复";
        }
        break;
      case "timeout":
        actionHint = "服务响应超时，可能是网络波动或服务负载较高，点击重试通常可恢复";
        break;
      case "rate_limit":
        actionHint = "已达到调用频率或配额限制，请稍候片刻后重试";
        break;
      case "auth":
        actionHint = "请检查账号登录状态或 API 密钥配置";
        break;
      case "server":
        actionHint = "服务端发生瞬时异常，点击重试通常可恢复";
        break;
      case "unknown":
      default:
        actionHint = "遇到异常，点击重试通常可恢复";
        break;
    }
  }

  const extraLinks: Array<{ text: string; url: string }> = [];
  if (learnMoreUrl) {
    extraLinks.push({ text: "了解更多", url: learnMoreUrl });
  }

  const summary = parts.join("\n");

  if (url) {
    return {
      kind,
      retryable,
      stage,
      actionHint,
      summary,
      validationUrl: url,
      validationLinkText: text ?? "验证我的账号",
      extraLinks,
    };
  }

  // 没有验证链接：回退为包含完整 cause 链的原始文本（截断）
  const MAX_FALLBACK = 800;
  const fallbackText =
    fullErrorText.length > MAX_FALLBACK
      ? `${fullErrorText.slice(0, MAX_FALLBACK)}…`
      : fullErrorText;

  return {
    kind,
    retryable,
    stage,
    actionHint,
    summary,
    extraLinks,
    fallbackText,
  };
}

/** 生成最终写入对话消息的 markdown 文本 */
export function buildSendErrorMessageMarkdown(parsed: ParsedSendError): string {
  const lines: string[] = ["[发送失败]", "", parsed.summary];
  if (parsed.actionHint && !parsed.validationUrl) {
    lines.push("", `建议：${parsed.actionHint}`);
  }
  if (parsed.validationUrl) {
    lines.push(
      "",
      `请点击链接完成验证：`,
      `- [${parsed.validationLinkText ?? "验证我的账号"}](${parsed.validationUrl})`
    );
  }
  for (const link of parsed.extraLinks) {
    lines.push(`- [${link.text}](${link.url})`);
  }
  if (parsed.fallbackText && !parsed.validationUrl) {
    lines.push("", "```", parsed.fallbackText, "```");
  }
  return lines.join("\n");
}
