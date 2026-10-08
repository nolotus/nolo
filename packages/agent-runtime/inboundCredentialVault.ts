/**
 * 输入端凭据隔离与本地保管库（Inbound Credential Isolation & Vault）。
 *
 * 核心安全机制：
 * 1. 【零知识 Prompt（Zero-Knowledge to LLM Context）】：
 *    用户输入的明文 API Key、私钥或密码在进入 Prompt 和对话历史前，
 *    被提取并存入本地受控的 CredentialBroker，替换为不透明引用 `$nolo_cred:vault-cred-xxx`；
 * 2. 【即时解包（JIT Unwrap at Execution Boundary）】：
 *    仅在本地受控运行时真正执行底层工具（如 execShell、fetchWebpage）的最后一刻，
 *    在内存中临时换出明文注入调用，明文绝不暴露给模型上下文与会话日志。
 */

import type { CredentialBroker, CredentialRef } from "./credentialBroker";
import { hasPotentialSecrets, scrubSecrets, SECRET_PATTERNS } from "./secretScrubber";
import type { AgentRuntimeMessageContent } from "./types";

export type IsolatedCredential = {
  ref: CredentialRef;
  kind: string;
  preview: string;
};

export type InboundIsolationResult = {
  safeText: string;
  isolatedCount: number;
  credentials: IsolatedCredential[];
};

// 提取可被独立引用化隔离的凭证模式（排除纯键值赋值类）
const INBOUND_PATTERNS = SECRET_PATTERNS.filter(
  (p) => p.kind !== "PASSWORD"
);

const REF_PREFIX = "$nolo_cred:";

/** 计算确定性摘要，生成稳定的 ref（如 vault-cred-1a2b3c4d5e6f） */
function computeDeterministicRef(secret: string): CredentialRef {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(secret);
  const hex = hasher.digest("hex").slice(0, 12);
  return `vault-cred-${hex}`;
}

/**
 * 扫描并隔离输入文本中的敏感凭据，写入本地 Broker 并替换为不透明引用。
 */
export async function isolateInboundCredentials(
  text: string,
  broker?: CredentialBroker | null
): Promise<InboundIsolationResult> {
  if (typeof text !== "string" || text.length === 0 || !broker) {
    return { safeText: text, isolatedCount: 0, credentials: [] };
  }

  if (!hasPotentialSecrets(text)) {
    return { safeText: text, isolatedCount: 0, credentials: [] };
  }

  let safeText = text;
  const isolatedCredentials: IsolatedCredential[] = [];

  for (const { kind, regex } of INBOUND_PATTERNS) {
    regex.lastIndex = 0;
    const matches = safeText.match(regex);
    if (!matches || matches.length === 0) continue;

    for (const rawSecret of matches) {
      // Bearer 特殊处理：如果是 "Bearer <token>"，只隔离 token 本身
      let secretToStore = rawSecret;
      let textToReplace = rawSecret;

      if (kind === "BEARER_TOKEN" && rawSecret.toLowerCase().startsWith("bearer ")) {
        secretToStore = rawSecret.slice(7).trim();
      }

      const ref = computeDeterministicRef(secretToStore);
      await broker.put(ref, secretToStore);

      const placeholder = kind === "BEARER_TOKEN"
        ? `Bearer ${REF_PREFIX}${ref}`
        : `${REF_PREFIX}${ref}`;

      safeText = safeText.replaceAll(textToReplace, placeholder);

      isolatedCredentials.push({
        ref,
        kind,
        preview: "[PROTECTED]",
      });
    }
  }

  // 兜底清洗：对隔离后的文本跑一次 scrubSecrets，确保未被独立引用化的敏感键值（如 PASSWORD=xxx）也被脱敏
  const scrubResult = scrubSecrets(safeText);
  safeText = scrubResult.cleaned;

  return {
    safeText,
    isolatedCount: isolatedCredentials.length,
    credentials: isolatedCredentials,
  };
}

/**
 * 支持纯文本与多模态 Parts 数组的通用输入隔离处理。
 */
export async function isolateInboundContent(
  content: AgentRuntimeMessageContent,
  broker?: CredentialBroker | null,
): Promise<{ safeContent: AgentRuntimeMessageContent; isolatedCount: number }> {
  if (typeof content === "string") {
    const res = await isolateInboundCredentials(content, broker);
    return { safeContent: res.safeText, isolatedCount: res.isolatedCount };
  }

  if (Array.isArray(content)) {
    let totalIsolated = 0;
    const safeParts = [];
    for (const part of content) {
      if (part?.type === "text" && typeof part.text === "string") {
        const res = await isolateInboundCredentials(part.text, broker);
        totalIsolated += res.isolatedCount;
        safeParts.push({ ...part, text: res.safeText });
      } else {
        safeParts.push(part);
      }
    }
    return { safeContent: safeParts, isolatedCount: totalIsolated };
  }

  return { safeContent: content, isolatedCount: 0 };
}

const REF_FINDER_REGEX = /\$nolo_cred:(vault-cred-[a-zA-Z0-9_\-]+)\b/g;

/**
 * 在受控 Runtime 执行底层工具时，按需从本地 Broker 换出明文凭证。
 */
export async function unwrapCredentialRefs(
  payload: string,
  broker?: CredentialBroker | null
): Promise<string> {
  if (typeof payload !== "string" || !payload.includes(REF_PREFIX) || !broker) {
    return payload;
  }

  REF_FINDER_REGEX.lastIndex = 0;
  const matches = [...payload.matchAll(REF_FINDER_REGEX)];
  if (matches.length === 0) return payload;

  let unwrapped = payload;
  for (const match of matches) {
    const fullTag = match[0]; // e.g. "$nolo_cred:vault-cred-abc123"
    const ref = match[1];     // e.g. "vault-cred-abc123"
    try {
      const realSecret = await broker.get(ref);
      if (typeof realSecret === "string" && realSecret.length > 0) {
        unwrapped = unwrapped.replaceAll(fullTag, realSecret);
      }
    } catch {
      // 容错降级：Broker 读取失败保留原 ref 占位，不崩溃
    }
  }

  return unwrapped;
}

/**
 * 工具调用前解包参数 JSON 字符串。
 */
export async function unwrapToolArguments(
  argumentsJson: string,
  broker?: CredentialBroker | null
): Promise<string> {
  if (!argumentsJson || !argumentsJson.includes(REF_PREFIX) || !broker) {
    return argumentsJson;
  }
  return unwrapCredentialRefs(argumentsJson, broker);
}
