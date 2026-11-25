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
            {t("guidedCreate.manualTitle", "创建AI")}
          </h1>
          <p {...stylex.props(styles.headerSubtitle)}>
            {t(
              "guidedCreate.sourceOverview",
              "平台内置无需配置。我的订阅：OAuth 品牌需在桌面端绑定，Token Plan 可用专用 Key 在网页创建。自带 API：填 Key，只有自定义兼容接口才需填 URL。本机 CLI 请从三张卡片下方进入。"
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
