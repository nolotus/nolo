import type { AgentRuntimeOptions } from "ai/agent/types";
import { createAgentKey } from "database/keys";
import { APP_BUILDER_PUBLIC_AGENT_KEY } from "app/constants/appEditor";
import { buildBuiltinObjectSkillReference, type BuiltinObjectSkillKind } from "ai/skills/builtinObjectSkills";

export type ObjectAssistantKind = "page" | "table" | "app" | "image" | "file";
export type BuiltinObjectAssistantKind = Exclude<ObjectAssistantKind, "app">;

/**
 * 纯解析器：根据 contentKeyType 解析对应的 ObjectAssistantKind。
 * 唯一的对象助手能力真值映射：
 * app   -> app
 * page  -> page
 * meta  -> table
 * image -> image
 * file  -> file
 * 其余   -> null
 */
export const resolveObjectAssistantKind = (
  contentKeyType?: string | null,
): ObjectAssistantKind | null => {
  switch (contentKeyType) {
    case "app":
      return "app";
    case "page":
      return "page";
    case "meta":
      return "table";
    case "image":
      return "image";
    case "file":
      return "file";
    default:
      return null;
  }
};

/** ObjectAssistantKind → 对应的 skill kind（page→doc, 其余同名）。 */
export const OBJECT_ASSISTANT_TO_SKILL: Record<BuiltinObjectAssistantKind, BuiltinObjectSkillKind> = {
  page: "doc",
  table: "table",
  image: "image",
  file: "file",
};

export const OBJECT_ASSISTANT_SIDEBAR_PREFIX = "objectAssistant";

export const BUILTIN_OBJECT_ASSISTANT_IDS: Record<BuiltinObjectAssistantKind, string> = {
  page: "builtin-doc-assistant-v1",
  table: "builtin-table-assistant-v1",
  image: "builtin-image-assistant-v1",
  file: "builtin-file-assistant-v1",
};

type ObjectAssistantUiConfig = {
  panelTitle: string;
  activePanelTitle: string;
  skillBadge: string;
  loginMessage: string;
  emptyMessage: string;
};

const OBJECT_ASSISTANT_UI: Record<ObjectAssistantKind, ObjectAssistantUiConfig> = {
  app: {
    panelTitle: "AI 助手",
    activePanelTitle: "AI 助手",
    skillBadge: "应用开发技能",
    loginMessage: "登录后可在侧边栏使用 AI 助手",
    emptyMessage: "AI 助手暂时不可用，请稍后重试",
  },
  page: {
    panelTitle: "AI 助手",
    activePanelTitle: "AI 助手",
    skillBadge: "文档技能",
    loginMessage: "登录后可在侧边栏使用 AI 助手",
    emptyMessage: "AI 助手暂时不可用，请稍后重试",
  },
  table: {
    panelTitle: "AI 助手",
    activePanelTitle: "AI 助手",
    skillBadge: "表格技能",
    loginMessage: "登录后可在侧边栏使用 AI 助手",
    emptyMessage: "AI 助手暂时不可用，请稍后重试",
  },
  image: {
    panelTitle: "AI 助手",
    activePanelTitle: "AI 助手",
    skillBadge: "图片技能",
    loginMessage: "登录后可在侧边栏使用 AI 助手",
    emptyMessage: "AI 助手暂时不可用，请稍后重试",
  },
  file: {
    panelTitle: "AI 助手",
    activePanelTitle: "AI 助手",
    skillBadge: "文件技能",
    loginMessage: "登录后可在侧边栏使用 AI 助手",
    emptyMessage: "AI 助手暂时不可用，请稍后重试",
  },
};

export const getObjectAssistantUiConfig = (kind: ObjectAssistantKind): ObjectAssistantUiConfig =>
  OBJECT_ASSISTANT_UI[kind];

export const getPreferredObjectAssistantKey = (
  kind: ObjectAssistantKind,
  userId?: string | null,
): string[] => {
  if (kind === "app") return [APP_BUILDER_PUBLIC_AGENT_KEY];
  if (!userId) return [];
  return [createAgentKey.private(userId, BUILTIN_OBJECT_ASSISTANT_IDS[kind])];
};

export const buildObjectAssistantSidebarId = (
  kind: ObjectAssistantKind,
  contentKey?: string | null,
) => `${OBJECT_ASSISTANT_SIDEBAR_PREFIX}:${kind}:${contentKey ?? "current"}`;

export const isObjectAssistantSidebarId = (id?: string | null) =>
  typeof id === "string" && id.startsWith(`${OBJECT_ASSISTANT_SIDEBAR_PREFIX}:`);

export const resolveBuiltinObjectAssistantKindByKey = (
  agentKey?: string | null,
  userId?: string | null,
): BuiltinObjectAssistantKind | null => {
  if (!agentKey || !userId) return null;

  const entries = Object.entries(BUILTIN_OBJECT_ASSISTANT_IDS) as Array<
    [BuiltinObjectAssistantKind, string]
  >;

  for (const [kind, id] of entries) {
    if (agentKey === createAgentKey.private(userId, id)) {
      return kind;
    }
  }

  return null;
};

type RuntimeArgs = {
  kind: ObjectAssistantKind;
  contentKey?: string | null;
  title?: string | null;
  summary?: string | null;
  tenantId?: string | null;
  tableId?: string | null;
  metadata?: Record<string, unknown>;
};

export const buildObjectAssistantRuntimeOptions = (
  args: RuntimeArgs,
): AgentRuntimeOptions => {
  const { kind, contentKey, title, summary, metadata = {} } = args;

  if (kind === "app") {
    return {
      extraTools: [
        "appRead",
        // appList：skill 正文「持续迭代」一节要求先用它找到目标应用，
        // 缺了这条工具面就断链（与 CAPABILITY_PACK_BY_ID["app-builder"].tools 对齐）。
        "appList",
        "appFileList",
        "appFileSearch",
        "appFileRead",
        "appFileWrite",
        "appFileReplace",
        "appPreflight",
        "appDeploy",
        "openAIGptImage",
      ],
      editingTarget: {
        kind: "app",
        key: contentKey ?? undefined,
        title: title ?? undefined,
        summary: summary ?? "当前应用可通过 AI 继续修改与重新部署，请围绕已有实现做增量迭代。",
        metadata,
      },
    };
  }

  if (kind === "table") {
    const tenantId =
      (typeof args.tenantId === "string" && args.tenantId) ||
      (typeof metadata?.tenantId === "string" && metadata.tenantId) ||
      undefined;
    const tableId =
      (typeof args.tableId === "string" && args.tableId) ||
      (typeof metadata?.tableId === "string" && metadata.tableId) ||
      undefined;

    return {
      editingTarget: {
        kind: "table",
        key: contentKey ?? undefined,
        title: title ?? undefined,
        summary:
          summary ??
          "当前对象是一张数据表。优先帮助用户理解字段、记录和结构，再做新增或修改。",
        tenantId,
        tableId,
        metadata,
      },
    };
  }

  if (kind === "page") {
    return {
      editingTarget: {
        kind: "page",
        key: contentKey ?? undefined,
        title: title ?? undefined,
        summary:
          summary ??
          "当前对象是一篇文档。优先围绕现有内容做润色、改写、续写、重组和排版建议。",
        metadata,
      },
    };
  }

  return {
    editingTarget: {
      kind,
      key: contentKey ?? undefined,
      title: title ?? undefined,
      summary:
        summary ??
        (kind === "image"
          ? "当前对象是一张图片，当前阶段优先做理解、描述和整理建议。"
          : "当前对象是一个文件，当前阶段优先做理解、整理和处理建议。"),
      metadata,
    },
  };
};
