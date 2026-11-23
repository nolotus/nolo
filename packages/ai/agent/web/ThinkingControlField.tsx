import React, { useId } from "react";
import { useTranslation } from "react-i18next";
import { PLATFORM_HOSTED_KIMI_K31_PRO_MODEL, PLATFORM_HOSTED_KIMI_PROVIDER } from "ai/llm/kimi";
import { resolvePlatformEffectiveModel, resolvePlatformHostedRouting } from "ai/llm/platformHostedRoutingTable";
import { clampReasoningEffort, isModelSupportReasoningEffort } from "ai/llm/reasoningModels";
import { FormField } from "render/web/form/FormField";
import RadioGroup from "render/web/form/RadioGroup";
import ToggleSwitch from "render/web/ui/ToggleSwitch";
import type { ReasoningEffort } from "../createAgentSchema";
import type { ThinkingControl } from "../modelReasoningCapability";

const PROVIDER_DEFAULT = "provider-default";

export type ThinkingSelection = {
  reasoningEffort?: ReasoningEffort | null;
  enableThinking?: boolean | null;
};

export default function ThinkingControlField({
  control, selection, onChange, readOnly, savedModelContext,
}: {
  control: ThinkingControl;
  selection: ThinkingSelection;
  onChange: (selection: ThinkingSelection) => void;
  readOnly?: boolean;
  savedModelContext?: {
    provider?: string | null;
    model?: string | null;
    apiSource?: string | null;
    customProviderUrl?: string | null;
    apiKey?: string | null;
    apiKeyRef?: string | null;
    cliProvider?: string | null;
  };
}) {
  const { t } = useTranslation("ai");
  const name = useId();
  if (control.controlKind === "off") return null;
  if (control.controlKind === "toggle") {
    const label = t("form.enableThinking", "思考模式");
    return (
      <FormField label={label} horizontal={false}>
        <ToggleSwitch
          aria-label={label}
          checked={selection.reasoningEffort != null
            ? selection.reasoningEffort !== "none"
            : selection.enableThinking ?? control.defaultEnabled}
          disabled={readOnly}
          onChange={(enableThinking) => onChange({ enableThinking, reasoningEffort: null })}
        />
      </FormField>
    );
  }

  const legacy = selection.reasoningEffort == null && selection.enableThinking != null;
  const saved = selection.reasoningEffort;
  const outsideOptions = Boolean(saved && !control.efforts.includes(saved));
  const { provider, model, apiSource, customProviderUrl, apiKey, apiKeyRef, cliProvider } = savedModelContext ?? {};
  const route = provider === PLATFORM_HOSTED_KIMI_PROVIDER &&
    (apiSource == null || apiSource === "platform") &&
    !customProviderUrl && !apiKey && !apiKeyRef && !cliProvider &&
    resolvePlatformEffectiveModel(model) === PLATFORM_HOSTED_KIMI_K31_PRO_MODEL
    ? resolvePlatformHostedRouting(model)
    : undefined;
  // Only promise an effective value for the route covered by the cross-runtime parity tests.
  const effective = outsideOptions && model && route?.keyName === "baseten" &&
    route.wire === "chat.completions" && route.agentRunHosted && isModelSupportReasoningEffort(model, provider ?? undefined)
    ? clampReasoningEffort(saved, provider, model)
    : undefined;
  const options = [{ value: PROVIDER_DEFAULT, label: t("form.thinkingDefault", "服务商默认") },
    ...control.efforts.map((effort) => ({ label: t(`form.thinkingDepthOptions.${effort}`, effort), value: effort }))];
  return (
    <FormField label={t("form.reasoningEffort", "思考深度")} horizontal={false}>
      {legacy ? <small>{selection.enableThinking
        ? t("help.thinkingLegacyOn", "当前沿用旧设置：思考已开启")
        : t("help.thinkingLegacyOff", "当前沿用旧设置：思考已关闭")}</small> : null}
      {outsideOptions ? <small>{effective && control.efforts.some((effort) => effort === effective)
        ? t("help.thinkingSavedEffortMapped", "已保存 {{saved}}；此模型实际使用 {{effective}}。", { saved, effective })
        : t("help.thinkingSavedEffortUnavailable", "已保存的值 {{saved}} 不在当前选项中。", { saved })}</small> : null}
      <RadioGroup
        name={name}
        value={selection.reasoningEffort ?? (legacy ? undefined : PROVIDER_DEFAULT)}
        options={options}
        disabled={readOnly}
        onChange={(value) => onChange(value === PROVIDER_DEFAULT
          ? { reasoningEffort: null, enableThinking: null }
          : { reasoningEffort: control.efforts.find((effort) => effort === value) })}
      />
    </FormField>
  );
}
