// packages/ai/agent/web/useModelReasoningCapability.ts
import { useEffect, useRef, useState } from "react";
import {
  queryModelReasoningCapability,
  THINKING_MECHANISM_PROVIDERS,
  type ModelReasoningCapability,
} from "../modelReasoningCapability";
import {
  getAvailableReasoningEfforts,
  type ReasoningEffort,
} from "../createAgentSchema";

export type UseModelReasoningCapabilityArgs = {
  provider: string | null | undefined;
  model: string | null | undefined;
};

export type UseModelReasoningCapabilityResult = {
  loading: boolean;
  info: ModelReasoningCapability | null;
};

const QUERY_DEBOUNCE_MS = 350;

/**
 * 按 (provider, model) 解析真实推理强度能力。
 * 其他 provider 为本地同步解析（override 表 → provider 映射），立即返回。
 */
export function useModelReasoningCapability(
  args: UseModelReasoningCapabilityArgs,
): UseModelReasoningCapabilityResult {
  const { provider, model } = args;
  const p = (provider ?? "").toLowerCase();
  const trimmedModel = (model ?? "").trim();
  const isOpenRouter = p === "openrouter";

  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<ModelReasoningCapability | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!p || !trimmedModel) {
      setLoading(false);
      setInfo(null);
      return;
    }

    const currentGen = ++generationRef.current;
    setLoading(true);

    const timer = setTimeout(
      () => {
        void (async () => {
          try {
            const res = await queryModelReasoningCapability(p, trimmedModel);
            if (currentGen === generationRef.current) {
              setInfo(res);
              setLoading(false);
            }
          } catch {
            if (currentGen === generationRef.current) {
              setInfo(null);
              setLoading(false);
            }
          }
        })();
      },
      isOpenRouter ? QUERY_DEBOUNCE_MS : 0,
    );

    return () => {
      clearTimeout(timer);
    };
  }, [p, trimmedModel, isOpenRouter]);

  return { loading, info };
}

/** 推理强度下拉的统一解析结果（创建面板三处 + 高级设置共用） */
export type ReasoningEffortResolution =
  | { kind: "unsupported-model" } // 模型级真值：该模型不支持推理强度
  | { kind: "no-levels" } // 支持推理但无独立档位可调
  | { kind: "provider-unavailable" } // provider 走 Thinking 机制 / 不提供该设置
  | { kind: "options"; efforts: ReasoningEffort[] };

/**
 * 由 (loading, info, provider) 决定下拉该渲染什么。
 */
export function resolveReasoningEffortOptions(
  info: ModelReasoningCapability | null,
  loading: boolean,
  provider: string | null | undefined,
): ReasoningEffortResolution {
  if (!loading && info?.found) {
    if (!info.supportsReasoning) return { kind: "unsupported-model" };
    if (info.efforts.length === 0) return { kind: "no-levels" };
    return { kind: "options", efforts: info.efforts };
  }
  const efforts = getAvailableReasoningEfforts(provider);
  return efforts.length === 0
    ? { kind: "provider-unavailable" }
    : { kind: "options", efforts };
}

/** provider 级不可用时的说明文案（三处面板共用） */
export function getReasoningEffortProviderHint(
  provider: string | null | undefined,
): string {
  const p = (provider ?? "").toLowerCase();
  if (THINKING_MECHANISM_PROVIDERS.has(p) || p === "qwen") {
    return "此服务商使用 Thinking 机制，无需设置推理强度";
  }
  if (p === "cursor") {
    return "Cursor 推理强度由模型名称后缀决定（如 -high）";
  }
  return "此服务商不支持推理强度设置";
}

/**
 * 档位自动校准：模型级真值返回后，当前值不在真实支持列表时吸附到默认/首档。
 * 创建面板自定义来源与订阅来源共用。
 */
export function useReasoningEffortCalibration(
  info: ModelReasoningCapability | null,
  value: ReasoningEffort,
  setValue: (v: ReasoningEffort) => void,
): void {
  useEffect(() => {
    if (!info?.found || !info.supportsReasoning || info.efforts.length === 0) {
      return;
    }
    if (!info.efforts.includes(value)) {
      setValue(info.defaultEffort ?? info.efforts[0]!);
    }
  }, [info, value, setValue]);
}
