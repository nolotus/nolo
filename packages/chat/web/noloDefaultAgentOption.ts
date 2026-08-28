// 「默认档 = nolo」这一个 UI 概念的唯一构造处。
//
// 首页 QuickChat 和对话页 composer 都在 AgentPickerControl 上放一个「空选 =
// 默认档」的行，以前各写各的：一边标签走 i18n、描述走 quickChat.autoAgent.default
// （四语言齐全），另一边标签硬编码、描述套了个 t() 但 "chat" namespace 根本没注册
// 资源——那是个假 i18n，永远只返回中文兜底。文案也不一致（「自动」vs「nolo」）。
//
// 收到一处之后：品牌名来自 builtinAgentCatalog（不走 i18n——它不该被翻译），
// 描述走 app 主 namespace 里那份有四语言资源的 key。
import { BUILTIN_NOLO_AGENT_NAME } from "core/builtinAgents";
import type { AgentPickerDefaultOption } from "./AgentPickerControl";

/** i18n 取值函数，兼容 react-i18next 的 `t`（只用到 key + 默认值两参形式）。 */
export type TranslateFn = (key: string, defaultValue: string) => string;

/** 描述文案的 i18n key —— 四语言资源在 app/i18n/translations/interface.locale.ts。 */
export const NOLO_DEFAULT_AGENT_DESCRIPTION_KEY = "quickChat.autoAgent.default";

const NOLO_DEFAULT_AGENT_DESCRIPTION_FALLBACK = "Nolo 默认模型，图文都能聊";

/**
 * 默认档在 picker 里显示的标签。就是品牌名，不翻译。
 * 单独导出是因为 aria-label 之类的地方要单独拼这个词。
 */
export const noloDefaultAgentLabel = (): string => BUILTIN_NOLO_AGENT_NAME;

/** 构造 AgentPickerControl 的 defaultOption（空选行）。 */
export function buildNoloDefaultAgentOption(
  t: TranslateFn,
): AgentPickerDefaultOption {
  return {
    label: noloDefaultAgentLabel(),
    description: t(
      NOLO_DEFAULT_AGENT_DESCRIPTION_KEY,
      NOLO_DEFAULT_AGENT_DESCRIPTION_FALLBACK,
    ),
  };
}
