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
  "gemini-3.7-flash-tiered": { modelEnum: "MODEL_PLACEHOLDER_M301", maxOutputTokens: 65536 },
  // Gemini 3.8 Flash 沿用 3.7 的 tiered 兼容策略：仓库内暂无 Antigravity discovery
  // 证据确认 3.8 的 wire modelEnum，禁止虚构，先只声明同档输出上限；enum 待
  // discovery 证据到位后补齐。
  "gemini-3.8-flash-tiered": { maxOutputTokens: 65536 },
  // Gemini 4 Argon：fetchAvailableModels（2026-10 实测）仅返回键 `gemini-4-argon-disabled`
  // （MODEL_PLACEHOLDER_M421，maxOutputTokens 65536，disabled=true，提示「仅 Ultra 订阅可用」）。
  // 该键名带 -disabled 后缀，不是已验证可调用的 wire id：对 streamGenerateContent 用
  // gemini-4-argon / -disabled / -tiered / -low 均返回 404。因此这里以 logical id 作为
  // 透传 wire id（开放后若 discovery 给出真实 id，只需改这一行与 resolve 分支），
  // enum 取自 discovery 的 M421，不凭空推测 low/medium/high 档位 id。
  // 2026-10-13 实测：UA 升到官方 2.23.1 后 discovery 与 2.18.1 完全一致（仍仅 gemini-4-argon-disabled，
  // disabled=true，tagTitle "Unavailable"，tagDescription "currently available to Ultra plan subscribers"），
  // streamGenerateContent 仍 404；loadCodeAssist currentTier=free-tier，账号非 Ultra，故保持占位映射。
  "gemini-4-argon": { modelEnum: "MODEL_PLACEHOLDER_M421", maxOutputTokens: 65536 },
  "gemini-3.6-flash-low": { maxOutputTokens: 65536 },
  "gemini-3.6-flash-medium": { maxOutputTokens: 65536 },
  "gemini-3.6-flash-high": { maxOutputTokens: 65536 },
  // 旧模型 wire 映射保留：存量自定义 agent 仍可能引用（注册表已下线不影响此处）。
  "gemini-3.5-flash-extra-low": { modelEnum: "MODEL_PLACEHOLDER_M187", maxOutputTokens: 65536 },
  "gemini-3.5-flash-low": { modelEnum: "MODEL_PLACEHOLDER_M20", maxOutputTokens: 65536 },
  "gemini-3-flash-agent": { modelEnum: "MODEL_PLACEHOLDER_M132", maxOutputTokens: 65536 },
  "gemini-3.1-pro-low": { modelEnum: "MODEL_PLACEHOLDER_M36", maxOutputTokens: 65535 },
  "gemini-pro-agent": { modelEnum: "MODEL_PLACEHOLDER_M16", maxOutputTokens: 65535 },
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
export function resolveAntigravityWireModel(logicalModelId: string): ResolvedAntigravityWire {
  const id = logicalModelId.trim();
  const lower = id.toLowerCase();

  if (lower === "gemini-3.5-flash") {
    const wireModelId = "gemini-3.5-flash-low";
    return { wireModelId, profile: WIRE_PROFILES[wireModelId] };
  }

  if (
    lower === "gemini-3.7-flash" ||
    ["gemini-3.7-flash-low", "gemini-3.7-flash-medium", "gemini-3.7-flash-high"].includes(lower)
  ) {
    const wireModelId = "gemini-3.7-flash-tiered";
    return { wireModelId, profile: WIRE_PROFILES[wireModelId] };
  }

  // Gemini 3.8 Flash：与 3.7 相同的 tiered 折叠（logical id 与 effort 别名统一到 -tiered）。
  if (
    lower === "gemini-3.8-flash" ||
    ["gemini-3.8-flash-low", "gemini-3.8-flash-medium", "gemini-3.8-flash-high"].includes(lower)
  ) {
    const wireModelId = "gemini-3.8-flash-tiered";
    return { wireModelId, profile: WIRE_PROFILES[wireModelId] };
  }

  // Gemini 4 Argon：effort 别名折叠到同一 wire id（discovery 未给出分档 id，见 WIRE_PROFILES 注释）。
  // ⚠️ 这里的折叠只是占位，**没有** 3.7/3.8 那样的调用证据支撑，也**不承诺**
  // low/medium/high 会得到不同 effort：上游若像 3.7 Flash 那样只认单一 tiered id，
  // 或另有分档 id，都需 Ultra 账号的 discovery/调用证据才能定论。拿到证据后，
  // 改 WIRE_PROFILES 的键与这里的 wireModelId 各一处即可。
  if (
    lower === "gemini-4-argon" ||
    ["gemini-4-argon-low", "gemini-4-argon-medium", "gemini-4-argon-high"].includes(lower)
  ) {
    const wireModelId = "gemini-4-argon";
    return { wireModelId, profile: WIRE_PROFILES[wireModelId] };
  }

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

export function getAntigravityWireProfile(wireModelId: string): AntigravityWireProfile | undefined {
  return WIRE_PROFILES[wireModelId];
}
