/**
 * Maps logical Antigravity model ids (e.g. gemini-3.1-pro) to Cloud Code Assist wire ids.
 * Ported from @oh-my-pi/pi-catalog variant-collapse + wire profiles (budget transport, default effort).
 */

export type AntigravityWireProfile = {
  modelEnum?: string;
  maxOutputTokens: number;
};

/** Routed upstream wire id + optional generation caps (OMP parity). */
export type ResolvedAntigravityWire = {
  wireModelId: string;
  profile?: AntigravityWireProfile;
};

const WIRE_PROFILES: Readonly<Record<string, AntigravityWireProfile>> = {
  // Antigravity discovery exposes 3.7 Flash as one tiered wire model.
  // The UI labels its effort variants (Low/Medium/High), but the literal
  // -medium/-high ids return 404 from streamGenerateContent.
  "gemini-3.7-flash-tiered": {
    modelEnum: "MODEL_PLACEHOLDER_M301",
    maxOutputTokens: 65536,
  },
  // Gemini 3.8 Flash 沿用 3.7 的 tiered 兼容策略：仓库内暂无 Antigravity discovery
  // 证据确认 3.8 的 wire modelEnum，禁止虚构，先只声明同档输出上限；enum 待
  // discovery 证据到位后补齐。
  "gemini-3.8-flash-tiered": { maxOutputTokens: 65536 },
  // Discovery (2026-11-16) exposes separate enabled Argon effort variants.
  "gemini-4-argon-low": {
    modelEnum: "MODEL_PLACEHOLDER_M419",
    maxOutputTokens: 65536,
  },
  "gemini-4-argon-medium": {
    modelEnum: "MODEL_PLACEHOLDER_M418",
    maxOutputTokens: 65536,
  },
  "gemini-4-argon-high": {
    modelEnum: "MODEL_PLACEHOLDER_M417",
    maxOutputTokens: 65536,
  },
  // Discovery (2026-11-17) exposes Carbon effort variants with their own enums and a
  // 262144 output cap (Argon caps at 65536). 裸 gemini-4-carbon 不在 discovery 里，
  // 必须折叠到 effort 变体，否则上游回 404。
  "gemini-4-carbon-low": {
    modelEnum: "MODEL_PLACEHOLDER_M438",
    maxOutputTokens: 262144,
  },
  "gemini-4-carbon-medium": {
    modelEnum: "MODEL_PLACEHOLDER_M437",
    maxOutputTokens: 262144,
  },
  "gemini-4-carbon-high": {
    modelEnum: "MODEL_PLACEHOLDER_M427",
    maxOutputTokens: 262144,
  },
  // Antigravity discovery 暴露 -medium / -high 变体；尚无 modelEnum 证据时不虚构 enum，仅声明 65536 输出上限。
  "gemini-4-hydrogen-medium": { maxOutputTokens: 65536 },
  "gemini-4-hydrogen-high": { maxOutputTokens: 65536 },
  // Gemini 4 Neon（官方 2026-11-18 发布；仅 Google AI Pro / Ultra / Enterprise）**不登记 profile**：
  // 2026-11-19 订阅档账号强制刷新 token 后跑 fetchAvailableModels（UA `antigravity/hub/2.26.0`），
  // 四个 effort 变体 `gemini-4-neon-low` / `-medium` / `-high` / `-xhigh` 全部 enabled，
  // 与官方 Antigravity 模型列表同形；同一批里仍没有裸 `gemini-4-neon`，free-tier 账号
  // 依旧只看到 `gemini-4-neon-disabled`（MODEL_PLACEHOLDER_M536，tagDescription
  // 「currently available to paid Pro and Ultra subscribers」）。
  // 这批 discovery 没有给出四个变体的 modelEnum，也没有给出各自的输出窗口，因此这里**不写
  // WIRE_PROFILES**：不虚构 enum、不复用 disabled 占位符的 262144 窗口、不折叠到
  // Hydrogen / Carbon 冒充。四个变体按 wire id 原样透传，输出上限回落 agentConfig.max_tokens。
  "gemini-3.6-flash-low": { maxOutputTokens: 65536 },
  "gemini-3.6-flash-medium": { maxOutputTokens: 65536 },
  "gemini-3.6-flash-high": { maxOutputTokens: 65536 },
  // 旧模型 wire 映射保留：存量自定义 agent 仍可能引用（注册表已下线不影响此处）。
  "gemini-3.5-flash-extra-low": {
    modelEnum: "MODEL_PLACEHOLDER_M187",
    maxOutputTokens: 65536,
  },
  "gemini-3.5-flash-low": {
    modelEnum: "MODEL_PLACEHOLDER_M20",
    maxOutputTokens: 65536,
  },
  "gemini-3-flash-agent": {
    modelEnum: "MODEL_PLACEHOLDER_M132",
    maxOutputTokens: 65536,
  },
  "gemini-3.1-pro-low": {
    modelEnum: "MODEL_PLACEHOLDER_M36",
    maxOutputTokens: 65535,
  },
  "gemini-pro-agent": {
    modelEnum: "MODEL_PLACEHOLDER_M16",
    maxOutputTokens: 65535,
  },
  "claude-sonnet-5": { maxOutputTokens: 64000 },
  "claude-sonnet-4-6": { maxOutputTokens: 64000 },
  "claude-opus-4-6-thinking": { maxOutputTokens: 64000 },
  "gemini-2.5-flash": { maxOutputTokens: 65536 },
  "gemini-2.5-pro": { maxOutputTokens: 65536 },
};

/**
 * Default effort for gemini-3.1-pro on Antigravity: low wire id (gemini-3.1-pro-low).
 * High effort would route to gemini-pro-agent per OMP; nolo agents default to low until effort is modeled.
 */
export function resolveAntigravityWireModel(
  logicalModelId: string,
  reasoningEffort?: string,
): ResolvedAntigravityWire {
  const id = logicalModelId.trim();
  const lower = id.toLowerCase();

  if (lower === "gemini-3.5-flash") {
    const wireModelId = "gemini-3.5-flash-low";
    return { wireModelId, profile: WIRE_PROFILES[wireModelId] };
  }

  if (
    lower === "gemini-3.7-flash" ||
    [
      "gemini-3.7-flash-low",
      "gemini-3.7-flash-medium",
      "gemini-3.7-flash-high",
    ].includes(lower)
  ) {
    const wireModelId = "gemini-3.7-flash-tiered";
    return { wireModelId, profile: WIRE_PROFILES[wireModelId] };
  }

  // Gemini 3.8 Flash：与 3.7 相同的 tiered 折叠（logical id 与 effort 别名统一到 -tiered）。
  if (
    lower === "gemini-3.8-flash" ||
    [
      "gemini-3.8-flash-low",
      "gemini-3.8-flash-medium",
      "gemini-3.8-flash-high",
    ].includes(lower)
  ) {
    const wireModelId = "gemini-3.8-flash-tiered";
    return { wireModelId, profile: WIRE_PROFILES[wireModelId] };
  }

  // Gemini 4 系（Argon / Carbon）：effort 变体是独立 wire 模型，逐档有独立 enum。
  // 显式变体优先于配置的默认 effort；未指定 effort 时回落 medium。
  const gemini4 = /^gemini-4-(argon|carbon)(?:-(low|medium|high))?$/.exec(
    lower,
  );
  if (gemini4) {
    const family = gemini4[1] ?? "argon";
    const explicitEffort = gemini4[2];
    const effort = reasoningEffort?.trim().toLowerCase();
    const selected =
      explicitEffort ??
      (effort === "low" || effort === "high" ? effort : "medium");
    const wireModelId = `gemini-4-${family}-${selected}`;
    return { wireModelId, profile: WIRE_PROFILES[wireModelId] };
  }

  // Gemini 4 Hydrogen：discovery 已验证存在 -medium / -high 变体；裸 id 按 effort 折叠至已验证变体（默认 medium）。
  const hydrogen = /^gemini-4-hydrogen(?:-(medium|high))?$/.exec(lower);
  if (hydrogen) {
    const explicitEffort = hydrogen[1];
    const effort = reasoningEffort?.trim().toLowerCase();
    const selected = explicitEffort ?? (effort === "high" ? "high" : "medium");
    const wireModelId = `gemini-4-hydrogen-${selected}`;
    return { wireModelId, profile: WIRE_PROFILES[wireModelId] };
  }

  // Gemini 4 Neon：四个 effort 变体是 discovery 里各自独立的 wire id（2026-11-19 订阅档账号实测
  // enabled，见 WIRE_PROFILES 说明），这里原样透传、不带 profile —— 不虚构 enum / 输出窗口，
  // 也不把裸 `gemini-4-neon` 折叠到某个档位：裸 id 从未出现在 discovery 里，凭空选一个默认
  // effort 等于编造上游行为。上游对未知 id 报 404 是如实的失败，比把从未观察到的 id 发出去
  // 或偷偷换模型更可诊断。

  if (lower === "gemini-3.6-flash") {
    const wireModelId = "gemini-3.6-flash-low";
    return { wireModelId, profile: WIRE_PROFILES[wireModelId] };
  }

  if (lower === "gemini-3.1-pro" || lower === "gemini-3.1-pro-preview") {
    const wireModelId = "gemini-3.1-pro-low";
    return { wireModelId, profile: WIRE_PROFILES[wireModelId] };
  }

  if (WIRE_PROFILES[id]) {
    return { wireModelId: id, profile: WIRE_PROFILES[id] };
  }

  return { wireModelId: id };
}

export function getAntigravityWireProfile(
  wireModelId: string,
): AntigravityWireProfile | undefined {
  return WIRE_PROFILES[wireModelId];
}
