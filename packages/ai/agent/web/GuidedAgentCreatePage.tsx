import React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "app/routing";
import { LuSettings } from "react-icons/lu";
import * as stylex from "@stylexjs/stylex";
import AgentForm from "./AgentForm";
import { buildAgentFormDataFromGuidedDraft } from "ai/agent/guidedCreation/draft";
import { DEFAULT_MODEL } from "ai/llm/providers";
import type { GuidedAgentDraft } from "ai/agent/guidedCreation/types";
import { guidedAgentCreatePageStyles as styles } from "./guidedAgentCreatePageStyles";
import { withLiteralClass } from "./withLiteralClass";
import "./agentPageStylexEscapeHatch.css";

const EMPTY_MANUAL_DRAFT: GuidedAgentDraft = {
  name: "",
  introduction: "",
  prompt: "",
  promptSummary: "",
  provider: DEFAULT_MODEL.provider,
  model: DEFAULT_MODEL.name,
  isPublic: false,
  capabilityIds: [],
  toolIds: [],
  references: [],
  tags: [],
  unresolved: [],
};

// canonical visual check route: /create/agent
const GuidedAgentCreatePage: React.FC = () => {
  const { t } = useTranslation("ai");
  const location = useLocation();
  const initialDraft = (location.state as { initialDraft?: Partial<GuidedAgentDraft> } | null)
    ?.initialDraft;
  const formInitialValues = React.useMemo(
    () =>
      initialDraft
        ? buildAgentFormDataFromGuidedDraft({
            ...EMPTY_MANUAL_DRAFT,
            ...initialDraft,
          })
        : undefined,
    [initialDraft]
  );

  return (
    <div {...withLiteralClass("manual-agent-create", styles.container)}>
      <header {...stylex.props(styles.header)}>
        <span {...stylex.props(styles.icon)}>
          <LuSettings size={18} aria-hidden="true" />
        </span>
        <div>
          <h1 {...stylex.props(styles.headerTitle)}>
            {t("guidedCreate.manualTitle", "手动配置 AI")}
          </h1>
          <p {...stylex.props(styles.headerSubtitle)}>
            {t(
              "guidedCreate.manualSubtitle",
              "先选运行方式。平台路径填提示词即可创建；API 用量计费填 URL 与 Key；订阅请用桌面端。知识、工具、发布用「高级编辑」。想边聊边建，可在新对话页使用对话创建 AI。"
            )}
          </p>
        </div>
      </header>

      <section
        {...stylex.props(styles.form)}
        aria-label={t("guidedCreate.manualForm", "手动配置表单")}
      >
        <AgentForm mode="create" initialValues={formInitialValues} />
      </section>
    </div>
  );
};

export default GuidedAgentCreatePage;
