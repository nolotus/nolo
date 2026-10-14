import type { ActionGate } from "../agent-runtime/actionGate";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedNonEmptyStringArray } from "core/stringArray";
import { asOptionalJsonRecord } from "./messages/parseJsonRecord";

export type ToolMessageConfirmRunLike = {
  id?: string;
  toolName?: string;
  interaction?: string;
  status?: string;
  input?: any;
  outputSummary?: string;
};

export type DeleteConfirmConfig = {
  confirmedInputKey: string;
  idKey: string;
  labelKeys: string[];
  fallbackLabel: string;
  failureLabel: string;
  executedSummary: string;
  entityLabel: string;
};

export const COMPOSER_DELETE_CONFIRM_TOOL_NAMES = [
  "deleteDialogs",
  "deleteSpaces",
] as const;

export type ComposerDeleteConfirmToolName =
  (typeof COMPOSER_DELETE_CONFIRM_TOOL_NAMES)[number];

export const DELETE_CONFIRM_CONFIG = {
  deleteDialogs: {
    confirmedInputKey: "confirmedDialogIds",
    idKey: "dialogId",
    labelKeys: ["title"],
    fallbackLabel: "toolConfirm.fallbackDialogs",
    failureLabel: "toolConfirm.failureDialogs",
    executedSummary: "toolConfirm.executedDialogs",
    entityLabel: "toolConfirm.entityDialog",
  },
  deleteSpaces: {
    confirmedInputKey: "confirmedSpaceIds",
    idKey: "spaceId",
    labelKeys: ["name", "title"],
    fallbackLabel: "toolConfirm.fallbackSpaces",
    failureLabel: "toolConfirm.failureSpaces",
    executedSummary: "toolConfirm.executedSpaces",
    entityLabel: "toolConfirm.entitySpace",
  },
} satisfies Record<ComposerDeleteConfirmToolName, DeleteConfirmConfig>;

export const getDeleteConfirmConfig = (toolName?: string | null) =>
  toolName && toolName in DELETE_CONFIRM_CONFIG
    ? DELETE_CONFIRM_CONFIG[toolName as keyof typeof DELETE_CONFIRM_CONFIG]
    : undefined;

export const isComposerDeleteConfirmToolName = (
  toolName: unknown
): toolName is ComposerDeleteConfirmToolName =>
  typeof toolName === "string" &&
  (COMPOSER_DELETE_CONFIRM_TOOL_NAMES as readonly string[]).includes(toolName);

export const shouldShowToolMessageConfirmBanner = (
  toolName: unknown,
  activeRun: ToolMessageConfirmRunLike | undefined
): boolean =>
  !!activeRun &&
  activeRun.interaction === "confirm" &&
  !isComposerDeleteConfirmToolName(toolName) &&
  (activeRun.status === "pending" ||
    activeRun.status === "running" ||
    activeRun.status === "failed");

export const buildConfirmActionGate = (
  toolName: unknown,
  activeRun: ToolMessageConfirmRunLike | undefined
): ActionGate | null => {
  if (!activeRun || activeRun.interaction !== "confirm") return null;
  const name =
    asOptionalTrimmedString(toolName) ??
    asOptionalTrimmedString(activeRun.toolName) ??
    "tool";
  const deleteConfig = getDeleteConfirmConfig(name);
  return {
    id: activeRun.id || `gate-${name}-confirm`,
    kind: "confirm",
    title: deleteConfig
      ? "toolConfirm.confirmDelete"
      : "toolConfirm.confirmExecGate",
    titleParams: deleteConfig
      ? { entity: deleteConfig.entityLabel }
      : { name },
    ...(activeRun.outputSummary ? { body: activeRun.outputSummary } : {}),
    payload: {
      toolName: name,
      input: activeRun.input,
    },
  };
};

export const parseDeleteConfirmPreview = (content: unknown): any | null =>
  asOptionalJsonRecord(content) ?? null;

/** Render an action-gate title: translate `title` key and nested `entity` key params. */
export const translateGateTitle = (
  t: (key: string, options?: Record<string, unknown>) => string,
  gate: { title: string; titleParams?: Record<string, string | number> }
): string => {
  const params = gate.titleParams ? { ...gate.titleParams } : undefined;
  if (params && typeof params.entity === "string") {
    params.entity = t(String(params.entity));
  }
  return t(gate.title, params);
};

export const resolveDeleteConfirmLabel = ({
  config,
  preview,
  fallback,
  translateMultiple,
}: {
  config: DeleteConfirmConfig | undefined;
  preview: any;
  fallback: string;
  /** i18n formatter; `entity` is the entityLabel key — caller should translate it. */
  translateMultiple: (args: {
    title: string;
    count: number;
    entity: string;
  }) => string;
}): string => {
  const deletable = Array.isArray(preview?.deletable) ? preview.deletable : [];
  const firstItem = deletable[0];
  const firstTitle = asTrimmedNonEmptyStringArray(
    config?.labelKeys?.map((key) => firstItem?.[key]),
  )[0];
  if (!firstTitle || !config) return fallback;
  if (deletable.length <= 1) return firstTitle;
  return translateMultiple({
    title: firstTitle,
    count: deletable.length,
    entity: config.entityLabel,
  });
};

export const collectDeleteConfirmIds = ({
  config,
  preview,
}: {
  config: DeleteConfirmConfig;
  preview: any;
}): string[] =>
  Array.isArray(preview?.deletable)
    ? asTrimmedNonEmptyStringArray(
        preview.deletable.map((item: any) => item?.[config.idKey]),
      )
    : [];
