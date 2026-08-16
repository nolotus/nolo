import React, { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuBot } from "react-icons/lu";
import { useAppDispatch, useAppSelector } from "app/store";
import { useCurrentUser } from "identity";
import { readAndWait, write, selectById } from "database/dbSlice";
import { useDocState, getDocState } from "render/page/docStore";
import {
  selectCurrentTable,
  selectTableFocusContext,
  selectTableRows,
} from "render/table/tableSlice";
import type { AgentRuntimeOptions } from "ai/agent/types";
import StreamingIndicator from "render/web/ui/StreamingIndicator";
import { useAppDetail } from "app/hooks/useAppDetail";
import { resolvePreferredAppRuntimeUrl } from "app/utils/appRuntimeUrl";
import { readAppServerOrigin } from "app/constants/appEditor";
import { useAppSelectedNode } from "app/appInspector/appInspectorStore";
import { ArtifactAssistantPanel } from "./PageAssistantPanel";
import {
  buildBuiltinObjectAssistantAgent,
  buildObjectAssistantRuntimeOptions,
  getObjectAssistantUiConfig,
  getPreferredObjectAssistantKey,
  OBJECT_ASSISTANT_TO_SKILL,
  type ObjectAssistantKind,
} from "./objectAssistantRegistry";
import { buildBuiltinObjectSkillReference } from "ai/skills/builtinObjectSkills";

interface ObjectAssistantPanelProps {
  kind: ObjectAssistantKind;
  contentKey?: string;
}

const ObjectAssistantShell: React.FC<{ message: string; loading?: boolean }> = ({
  message,
  loading = false,
}) => (
  <aside className="page-assistant-panel">
    <header className="page-assistant-panel__header">
      <div className="page-assistant-panel__title">
        <span className="page-assistant-panel__title-icon" aria-hidden="true">
          <LuBot size={14} aria-hidden="true" />
        </span>
        <span>{message}</span>
      </div>
    </header>

    <div className="page-assistant-panel__body">
      <div className="page-assistant-panel__loading">
        {loading ? <StreamingIndicator /> : <span>{message}</span>}
      </div>
    </div>
  </aside>
);

const ObjectAssistantPanelBase: React.FC<ObjectAssistantPanelProps> = ({
  kind,
  contentKey,
}) => {
  const { t } = useTranslation(["chat"]);
  const dispatch = useAppDispatch();
  const currentUser = useCurrentUser();
  // doc state now lives in the standalone docStore (peeled out of Redux).
  const doc = useDocState();
  const docTitle = doc.title;
  const docFocusContext = doc.focusContext;
  const table = useAppSelector(selectCurrentTable);
  const appSelectedNode = useAppSelectedNode();
  const tableFocusContext = useAppSelector(selectTableFocusContext);
  const tableRows = useAppSelector(selectTableRows);
  const entity = useAppSelector((state) =>
    contentKey ? selectById(state, contentKey) : null
  );
  const routeServerOrigin =
    typeof window !== "undefined" ? readAppServerOrigin(window.location.search) : undefined;
  const { app, loading: appLoading, error: appError } = useAppDetail(
    kind === "app" ? contentKey : undefined,
    {
      prepareEdit: kind === "app",
      serverOrigin:
        kind === "app" && typeof entity?.serverOrigin === "string"
          ? entity.serverOrigin
          : routeServerOrigin,
    }
  );

  const [preferredAgentKeys, setPreferredAgentKeys] = useState<string[]>(
    kind === "app" ? getPreferredObjectAssistantKey(kind, currentUser?.userId) : []
  );
  const [isPreparingPreferredAgent, setIsPreparingPreferredAgent] = useState(false);
  const ui = getObjectAssistantUiConfig(kind);

  // page/table/image/file 的对象技能作为对话级引用挂载：composer 切换到用户自己的 agent 后，
  // 工具与操作指南（dialog.extraReferences）仍然生效。
  const skillExtraReferences = useMemo(() => {
    if (!currentUser?.userId || kind === "app") return undefined;
    return [buildBuiltinObjectSkillReference(OBJECT_ASSISTANT_TO_SKILL[kind], currentUser.userId)];
  }, [kind, currentUser?.userId]);

  useEffect(() => {
    if (kind === "app") {
      setPreferredAgentKeys(getPreferredObjectAssistantKey(kind, currentUser?.userId));
      setIsPreparingPreferredAgent(false);
      return;
    }
    if (!currentUser?.userId) {
      setPreferredAgentKeys([]);
      setIsPreparingPreferredAgent(false);
      return;
    }

    const agent = buildBuiltinObjectAssistantAgent(kind, currentUser.userId);
    let cancelled = false;
    setIsPreparingPreferredAgent(true);

    void (async () => {
      try {
        const existing = await dispatch(readAndWait(agent.dbKey)).unwrap().catch(() => null);
        if (!existing) {
          await dispatch(write({ data: agent, customKey: agent.dbKey })).unwrap();
        }
        if (!cancelled) {
          setPreferredAgentKeys([agent.dbKey]);
        }
      } catch (error) {
        console.error("Failed to prepare object assistant agent:", error);
        if (!cancelled) {
          setPreferredAgentKeys([]);
        }
      } finally {
        if (!cancelled) {
          setIsPreparingPreferredAgent(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.userId, dispatch, kind]);

  const runtimeOptions: AgentRuntimeOptions | undefined = useMemo(() => {
    if (kind === "app") {
      if (!app) return undefined;
      return buildObjectAssistantRuntimeOptions({
        kind,
        contentKey: app.appId,
        title: app.userFriendlyName,
        summary:
          "当前应用可通过 AI 继续修改与重新部署。请围绕已有实现做增量迭代，而不是重建一个新应用。",
        metadata: {
          framework: app.framework ?? "worker",
          appUrl: resolvePreferredAppRuntimeUrl({
            appId: app.appId,
            customUrl: app.customUrl,
            url: app.url,
          }),
          fileNames: Array.isArray(app.files) ? app.files.map((file) => file.name) : [],
          externalImports: Array.isArray(app.externalImports)
            ? app.externalImports
            : [],
          ...(appSelectedNode ? { selectedNode: appSelectedNode } : {}),
        },
      });
    }

    if (kind === "page") {
      return buildObjectAssistantRuntimeOptions({
        kind,
        contentKey: contentKey ?? doc?.pageKey ?? undefined,
        title: docTitle ?? entity?.title ?? "未命名文档",
        metadata: {
          pageKey: contentKey ?? doc?.pageKey ?? undefined,
          docType: doc?.type ?? entity?.type ?? "page",
          hasSlateData: Array.isArray(doc?.slateData),
          tags: Array.isArray(doc?.tags) ? doc.tags : [],
          focusContext: docFocusContext,
        },
      });
    }

    if (kind === "table") {
      return buildObjectAssistantRuntimeOptions({
        kind,
        contentKey: contentKey ?? table?.dbKey ?? undefined,
        title: table?.displayName ?? table?.tableId ?? entity?.title ?? "未命名表格",
        metadata: {
          tenantId: table?.tenantId,
          tableId: table?.tableId,
          rowCount: Array.isArray(tableRows) ? tableRows.length : 0,
          columnNames: Array.isArray(table?.columns)
            ? table.columns.map((column) => column.name)
            : [],
          focusContext: tableFocusContext,
        },
      });
    }

    if (kind === "image") {
      return buildObjectAssistantRuntimeOptions({
        kind,
        contentKey,
        title: entity?.title ?? "当前图片",
        metadata: {
          fileId: entity?.fileId ?? contentKey,
          type: entity?.type ?? "image",
          url: entity?.url,
        },
      });
    }

    if (kind === "file") {
      return buildObjectAssistantRuntimeOptions({
        kind,
        contentKey,
        title: entity?.title ?? "当前文件",
        metadata: {
          fileId: entity?.fileId ?? contentKey,
          type: entity?.type ?? "file",
          url: entity?.url,
          size: entity?.size,
        },
      });
    }

    return undefined;
  }, [
    app,
    contentKey,
    doc,
    docFocusContext,
    docTitle,
    entity,
    kind,
    table,
    tableFocusContext,
    tableRows,
    appSelectedNode,
  ]);

  if (kind === "app" && appLoading) {
    return (
      <ObjectAssistantShell
        message={t("chat:appAssistantLoading", "正在加载应用上下文…")}
        loading
      />
    );
  }

  if (kind === "app" && (appError || !app || !runtimeOptions)) {
    return (
      <ObjectAssistantShell
        message={appError || t("chat:appAssistantLoadFailed", "加载应用上下文失败")}
      />
    );
  }

  if (kind === "app" && app?.editSafety === "rebuild-risk") {
    return (
      <ObjectAssistantShell
        message={t(
          "chat:appAssistantNeedsRecovery",
          "这版应用目前还不适合直接做小范围修改。我可以先按当前页面整理成可继续编辑的版本，再继续帮你改。"
        )}
      />
    );
  }

  if (kind !== "app" && isPreparingPreferredAgent && preferredAgentKeys.length === 0) {
    return (
      <ObjectAssistantShell
        message={t(`chat:${kind}AssistantPreparing`, `正在准备${ui.panelTitle}…`)}
        loading
      />
    );
  }

  // 与 runtimeOptions 相同的 key 解析：page/table 的 contentKey 可能为空，
  // 需回退到 Redux 里的当前文档/表，否则所有文档共享同一个 key。
  const effectiveContentKey =
    kind === "page"
      ? contentKey ?? doc?.pageKey ?? "current"
      : kind === "table"
        ? contentKey ?? table?.dbKey ?? "current"
        : contentKey ?? "current";

  return (
    // key 按内容维度隔离：切到另一篇文档/另一张表/另一个应用时强制重挂载，
    // 否则 React 复用组件实例，面板会继续显示上一个内容的侧栏对话。
    <ArtifactAssistantPanel
      key={effectiveContentKey}
      panelTitle={t(`chat:${kind}AssistantPanelTitle`, ui.panelTitle)}
      activePanelTitle={t(`chat:${kind}AssistantTitle`, ui.activePanelTitle)}
      emptyMessage={t(`chat:${kind}AssistantEmpty`, ui.emptyMessage)}
      loginMessage={t(`chat:${kind}AssistantLogin`, ui.loginMessage)}
      preferredAgentKeys={preferredAgentKeys}
      extraReferences={skillExtraReferences}
      runtimeOptions={runtimeOptions}
    />
  );
};

const ObjectAssistantPanel = memo(ObjectAssistantPanelBase);

export default ObjectAssistantPanel;
