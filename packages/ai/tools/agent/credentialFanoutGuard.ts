// packages/ai/tools/agent/credentialFanoutGuard.ts
//
// 并发扇出凭证隔离（纯逻辑，零 I/O，全端共享）。
//
// 背景（2026 实证）：两个 credentialGroup 为空的 agent 被当成「互相独立」
// 并发派发——实际上无法证明它们不共用同一份上游 key。本模块把「凭证未知」
// 从「凭证独立」中显式区分出来：
//
//   - credentialGroup 为 undefined / 空串 / "unknown" → 一律视为 unknown；
//   - unknown 与任何条目（包括另一个 unknown）都构成冲突——不能证明独立；
//   - 两个已知且相同的 credentialGroup → 同一凭证，禁止并发扇出；
//   - 两个已知且不同的 credentialGroup → 允许并发。
//
// 冲突时的唯一放行口是调用方显式 allowUnknownCredential=true（工具参数
// allowUnknownCredential / CLI --force-unknown-credential），表示调用方已
// 自行确认风险。绝不静默放行。
//
// 本模块只做判定；活跃 run 集合的来源由各端自己提供
// （CLI 读 ~/.nolo/runs，web 端用进程内批次注册表）。

/** 凭证未知时的规范化组名。 */
export const UNKNOWN_CREDENTIAL_GROUP = "unknown";

export type CredentialFanoutEntry = {
  runId?: string;
  agentKey?: string;
  credentialGroup?: string | null;
};

export type CredentialFanoutVerdict =
  | { allowed: true }
  | {
      allowed: false;
      reason: "credential_group_conflict" | "unknown_credential_group";
      message: string;
      /** 与之冲突的已活跃条目。 */
      conflict: CredentialFanoutEntry;
    };

/**
 * 规范化 credentialGroup：缺失/空串/"unknown"（大小写不敏感）一律归为
 * UNKNOWN_CREDENTIAL_GROUP。调用方拿到的一定是非空字符串。
 */
export function normalizeCredentialGroupValue(
  group: string | null | undefined
): string {
  if (typeof group !== "string") return UNKNOWN_CREDENTIAL_GROUP;
  const trimmed = group.trim();
  if (!trimmed) return UNKNOWN_CREDENTIAL_GROUP;
  if (trimmed.toLowerCase() === UNKNOWN_CREDENTIAL_GROUP) {
    return UNKNOWN_CREDENTIAL_GROUP;
  }
  return trimmed;
}

const describeEntry = (entry: CredentialFanoutEntry): string =>
  entry.agentKey ?? entry.runId ?? "(unknown run)";

/**
 * 检查 candidate 能否与 active 集合并发运行。
 *
 * active 应只包含**仍未终态**的 run（已结束的 run 不占凭证预算，顺序复用
 * 同一凭证永远合法）。同一 runId 的条目会被跳过（续跑/重入不算自冲突）。
 */
export function checkCredentialFanout(args: {
  active: CredentialFanoutEntry[];
  candidate: CredentialFanoutEntry;
  allowUnknownCredential?: boolean;
}): CredentialFanoutVerdict {
  const candidateGroup = normalizeCredentialGroupValue(
    args.candidate.credentialGroup
  );

  for (const entry of args.active) {
    if (
      entry.runId &&
      args.candidate.runId &&
      entry.runId === args.candidate.runId
    ) {
      continue;
    }
    const entryGroup = normalizeCredentialGroupValue(entry.credentialGroup);

    if (
      candidateGroup === UNKNOWN_CREDENTIAL_GROUP ||
      entryGroup === UNKNOWN_CREDENTIAL_GROUP
    ) {
      // 任一侧凭证未知：无法证明两侧不共用上游 key。显式放行除外。
      if (args.allowUnknownCredential === true) continue;
      const side =
        candidateGroup === UNKNOWN_CREDENTIAL_GROUP ? "candidate" : "active";
      return {
        allowed: false,
        reason: "unknown_credential_group",
        conflict: entry,
        message:
          `拒绝并发派发：${
            side === "candidate"
              ? `候选 agent ${describeEntry(args.candidate)} 的 credentialGroup 未知`
              : `已活跃 run ${describeEntry(entry)} 的 credentialGroup 未知`
          }，无法证明它与同批并发 run 不共用上游凭证。` +
          `请改为串行派发、换用 credentialGroup 明确的 agent，或在确认风险后显式传 allowUnknownCredential: true 强制放行。`,
      };
    }

    if (candidateGroup === entryGroup) {
      return {
        allowed: false,
        reason: "credential_group_conflict",
        conflict: entry,
        message:
          `拒绝并发派发：候选 agent ${describeEntry(args.candidate)} 与已活跃 run ` +
          `${describeEntry(entry)} 同属 credentialGroup "${candidateGroup}"，` +
          `同一凭证上禁止并发扇出。请串行派发或改用其他 credentialGroup 的 agent。`,
      };
    }
  }

  return { allowed: true };
}
