import "./styles.css";
import type React from "react";
import {
  CAPABILITY_PACKS,
  CAPABILITY_PACK_BY_ID,
  ALWAYS_ON_PACK_IDS,
} from "ai/tools/toolPacks";
import type { AgentSkillConfig, AgentSkillMode } from "ai/tools/agentSkillConfig";

type CapabilityPackSelectorProps = {
  /** 三态配置：slug → 档位。缺席即禁用。 */
  value: AgentSkillConfig;
  onChange: (next: AgentSkillConfig) => void;
  /** Existing disabledTools（用于联动计算增量）。可选。 */
  disabledTools?: string[];
  /** 联动写回 disabledTools（禁用 ensure 包时写入包工具）。可选。 */
  onDisabledToolsChange?: (disabledTools: string[]) => void;
  className?: string;
};

/**
 * 禁用后会被运行时 ensure 补回的包（F-R5-1）：三端 resolveEffectiveEnabledPacks
 * 对 agent-orchestration、skills 幂等 ensure，用户在面板禁用无法真正关闭，必须把
 * 包工具写入 disabledTools（applyDisabledTools 在 ensure 之后执行，优先级最高）。
 * 注意：long-term-memory 仅"空配置"时由 web fallback 补回，且已有"disabledTools 单关
 * rememberMemory"的既有交互，不在本联动范围。
 */
const RUNTIME_ENSURED_PACK_IDS = ["agent-orchestration", "skills"] as const;

/**
 * 运行时强制常驻、拿不到「启用」这一档的包。
 *
 * ALWAYS_ON_PACK_IDS 由 resolveEffectiveEnabledPacks 无条件追加，
 * agent-orchestration 的工具由 addDefaultSystemCapabilityTools 默认挂载——
 * 对它们选「启用」会被运行时静默升成「完整启用」。UI 不能撒谎，所以这一档
 * 对它们置灰，只留「完整启用 / 禁用」两个真实可达的选项。
 */
const FORCED_MOUNT_PACK_IDS = new Set<string>([
  ...ALWAYS_ON_PACK_IDS,
  ...RUNTIME_ENSURED_PACK_IDS,
]);

type ModeOption = {
  mode: AgentSkillMode | null;
  label: string;
  hint: string;
};

/** null = 禁用（配置里缺席）。顺序按「给得越多越靠右」排。 */
const MODE_OPTIONS: readonly ModeOption[] = [
  { mode: null, label: "禁用", hint: "完全拿不到这个能力" },
  {
    mode: "recommended",
    label: "启用",
    hint: "工具不常驻，agent 需要时自己载入——省 token，适合偶尔才用到的能力",
  },
  {
    mode: "required",
    label: "完整启用",
    hint: "工具一直挂着，配套纪律也注入——适合这个 agent 的主职能力",
  },
];

/**
 * 面向普通用户的能力选择器：一个控件控制一整组工具的启用强度。
 * 用户看到的是「联网搜索」「深度浏览器」这样的能力名，
 * 而非 exa_search、browser_openSession 等散装工具名。
 */
export const CapabilityPackSelector: React.FC<CapabilityPackSelectorProps> = ({
  value = {},
  onChange,
  disabledTools = [],
  onDisabledToolsChange,
  className = "",
}) => {
  const handleSelect = (packId: string, mode: AgentSkillMode | null) => {
    const next: AgentSkillConfig = { ...value };
    if (mode) next[packId] = mode;
    else delete next[packId];
    onChange(next);

    // disabledTools 联动只看「有没有被禁用」，与 required/recommended 无关。
    const pack = CAPABILITY_PACK_BY_ID[packId];
    const isEnsured = RUNTIME_ENSURED_PACK_IDS.includes(
      packId as (typeof RUNTIME_ENSURED_PACK_IDS)[number],
    );
    if (!isEnsured || !pack) return;

    if (mode) {
      // 重新启用 ensure 包：从 disabledTools 移除该包工具（此前联动写入的）。
      if (disabledTools.length === 0) return;
      const nextDisabled = disabledTools.filter(
        (tool) => !pack.tools.includes(tool as any),
      );
      if (nextDisabled.length !== disabledTools.length) {
        onDisabledToolsChange?.(nextDisabled);
      }
      return;
    }
    // 禁用 ensure 包：把包工具写入 disabledTools，避免运行时 ensure 补回。
    const nextDisabled = [...new Set([...disabledTools, ...pack.tools])];
    if (nextDisabled.length !== disabledTools.length) {
      onDisabledToolsChange?.(nextDisabled);
    }
  };

  return (
    <div className={`capability-packs ${className}`}>
      {CAPABILITY_PACKS.map((pack) => {
        const current = value[pack.id] ?? null;
        const isForcedMount = FORCED_MOUNT_PACK_IDS.has(pack.id);
        return (
          <div
            key={pack.id}
            className={
              "capability-packs__item" +
              (current ? " capability-packs__item--selected" : "")
            }
          >
            <div className="capability-packs__item-header">
              <span className="capability-packs__item-icon" aria-hidden="true">
                {pack.icon}
              </span>
              <span className="capability-packs__item-name">{pack.label}</span>
              <div
                className="capability-packs__modes"
                role="radiogroup"
                aria-label={`${pack.label} 启用强度`}
              >
                {MODE_OPTIONS.map((option) => {
                  // 运行时强制常驻的包拿不到「启用」这一档，置灰而不是假装可选。
                  const unavailable =
                    isForcedMount && option.mode === "recommended";
                  const selected = current === option.mode;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={unavailable}
                      title={
                        unavailable
                          ? "这个能力由运行时强制常驻，只能选「完整启用」或「禁用」"
                          : option.hint
                      }
                      className={
                        "capability-packs__mode" +
                        (selected ? " capability-packs__mode--active" : "")
                      }
                      onClick={() => handleSelect(pack.id, option.mode)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="capability-packs__item-description">
              {pack.description}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CapabilityPackSelector;
