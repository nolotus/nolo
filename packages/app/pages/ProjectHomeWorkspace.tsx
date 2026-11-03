import React, { useState, useEffect } from "react";
import { NavLink } from "app/routing";
import type { MyContentListItem } from "app/utils/myContentItems";
import { buildRoutableContentPath } from "create/space/contentKeyUtils";
import {
  type DesktopFolderProject,
  updateDesktopProject,
  assignDesktopProjectContentGroup,
  DESKTOP_DIALOG_PROJECTS_KEY,
} from "chat/web/desktopFolderProjects";
import { dialogsForLocalProject, parseLocalDialogProjectBindings } from "chat/web/homeLocalProjectDialogs";
import { requestPickFolderPath } from "chat/web/desktopFolderProjectsPicker";
import QuickChat from "./QuickChat";
import { LocalMusicLibraryPanel } from "app/music/LocalMusicLibraryPanel";
import "./ProjectHomeWorkspace.css";

export interface ProjectHomeWorkspaceProps {
  project: DesktopFolderProject;
  items: readonly MyContentListItem[];
  userId?: string;
  projectAgentId: string;
  onSelectProjectAgentId: (agentId: string) => void;
  onExitProject?: () => void;
}

function truncateMiddle(str: string, maxLength: number) {
  if (str.length <= maxLength) return str;
  const half = Math.floor((maxLength - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(-half)}`;
}

export function ProjectHomeWorkspace({
  project,
  items,
  userId = "",
  projectAgentId,
  onSelectProjectAgentId,
}: ProjectHomeWorkspaceProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(project.name);
  const [folderBusy, setFolderBusy] = useState(false);
  const [showAllDialogs, setShowAllDialogs] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<"references" | "outcomes" | "music" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setNameInput(project.name);
  }, [project.name]);

  const saveProjectName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === project.name) {
      setNameInput(project.name);
      setIsEditingName(false);
      return;
    }
    try {
      updateDesktopProject(window.localStorage, project.id, { name: trimmed });
      setIsEditingName(false);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "重命名失败");
    }
  };

  const handlePickFolder = async () => {
    if (folderBusy) return;
    setFolderBusy(true);
    setError("");
    try {
      const selectedPath = await requestPickFolderPath();
      if (selectedPath) {
        updateDesktopProject(window.localStorage, project.id, { localPath: selectedPath });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "选择文件夹失败");
    } finally {
      setFolderBusy(false);
    }
  };

  // 资料库：排除 agent
  const referenceKeys = (project.linkedContentKeys ?? []).filter((key) => !key.startsWith("agent-"));
  const linkedAgents = (project.linkedContentKeys ?? []).filter((key) => key.startsWith("agent-"));
  const outcomeKeys = project.outcomeKeys ?? [];

  const handleAddReference = (contentKey: string) => {
    if (!contentKey) return;
    const targetItem = items.find((i) => i.contentKey === contentKey);
    const title = targetItem?.title || contentKey;
    try {
      const nextKeys = [...new Set([...(project.linkedContentKeys ?? []), contentKey])];
      const nextLabels = {
        ...(project.linkedContentLabels ?? {}),
        [contentKey]: title,
      };
      updateDesktopProject(window.localStorage, project.id, {
        linkedContentKeys: nextKeys,
        linkedContentLabels: nextLabels,
      });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加资料失败");
    }
  };

  const handleRemoveReference = (contentKey: string) => {
    try {
      const nextKeys = (project.linkedContentKeys ?? []).filter((k) => k !== contentKey);
      assignDesktopProjectContentGroup(window.localStorage, project.id, contentKey, null);
      updateDesktopProject(window.localStorage, project.id, {
        linkedContentKeys: nextKeys,
      });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "移除资料失败");
    }
  };

  const handleAddOutcome = (contentKey: string) => {
    if (!contentKey) return;
    try {
      const nextOutcomes = [...new Set([...(project.outcomeKeys ?? []), contentKey])];
      updateDesktopProject(window.localStorage, project.id, { outcomeKeys: nextOutcomes });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加成果失败");
    }
  };

  const handleRemoveOutcome = (contentKey: string) => {
    try {
      const nextOutcomes = (project.outcomeKeys ?? []).filter((k) => k !== contentKey);
      assignDesktopProjectContentGroup(window.localStorage, project.id, contentKey, null);
      updateDesktopProject(window.localStorage, project.id, { outcomeKeys: nextOutcomes });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "移除成果失败");
    }
  };

  // 对话列表
  let bindings: Record<string, unknown> = {};
  try {
    bindings = parseLocalDialogProjectBindings(window.localStorage.getItem(DESKTOP_DIALOG_PROJECTS_KEY));
  } catch {
    bindings = {};
  }
  const projectDialogs = dialogsForLocalProject(items, userId, project.id, bindings);
  const displayedDialogs = showAllDialogs ? projectDialogs : projectDialogs.slice(0, 3);

  // 渲染单条资料项
  const renderReferenceItem = (key: string) => {
    const item = items.find((i) => i.contentKey === key);
    const title = project.linkedContentLabels?.[key] || item?.title || key;

    return (
      <div key={key} className="project-workspace__item" data-hook="reference-item">
        <div className="project-workspace__item-info" title={title}>
          <span className="project-workspace__item-link">{title}</span>
          {item?.type && <span className="project-workspace__item-badge">{item.type}</span>}
        </div>
        <div className="project-workspace__item-actions">
          <button
            type="button"
            className="project-workspace__remove-btn"
            title="移除资料"
            aria-label={`移除资料 ${title}`}
            onClick={() => handleRemoveReference(key)}
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  // 渲染单条成果项
  const renderOutcomeItem = (key: string) => {
    const item = items.find((i) => i.contentKey === key);
    const title = item?.title || key;
    const linkPath = buildRoutableContentPath({
      contentKey: key,
      type: item?.type || "doc",
      userId,
      spaceId: project.spaceId,
    });

    return (
      <div key={key} className="project-workspace__item" data-hook="outcome-item">
        <div className="project-workspace__item-info" title={title}>
          <NavLink to={linkPath} className="project-workspace__item-link">
            {title}
          </NavLink>
          {item?.type && <span className="project-workspace__item-badge">{item.type}</span>}
        </div>
        <div className="project-workspace__item-actions">
          <button
            type="button"
            className="project-workspace__remove-btn"
            title="移除成果"
            aria-label={`移除成果 ${title}`}
            onClick={() => handleRemoveOutcome(key)}
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  const archivePath = project.archiveKey
    ? buildRoutableContentPath({
        contentKey: project.archiveKey,
        type: "page",
        userId,
        spaceId: project.spaceId,
      })
    : "";

  return (
    <div className="project-workspace" data-hook="project-workspace">
      {error && <p role="alert" style={{ color: "#e53935", margin: 0 }}>{error}</p>}

      {/* 问候语 -> 编辑框外上沿（项目名、文件夹横排，左对齐） -> 主编辑框（QuickChat） */}
      <section className="project-workspace__composer">
        <QuickChat
          key={`${project.id}:${projectAgentId}`}
          beforeComposer={
            <div className="project-workspace__header">
              <div className="project-workspace__header-top">
                <div className="project-workspace__title-wrapper">
                  {isEditingName ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        aria-label="编辑项目名称"
                        autoFocus
                        className="project-workspace__name-input"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveProjectName();
                          if (e.key === "Escape") {
                            setNameInput(project.name);
                            setIsEditingName(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        data-hook="project-name-save-btn"
                        className="project-workspace__btn"
                        onClick={saveProjectName}
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        className="project-workspace__btn"
                        onClick={() => {
                          setNameInput(project.name);
                          setIsEditingName(false);
                        }}
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <h2
                      className="project-workspace__title"
                      onClick={() => setIsEditingName(true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setIsEditingName(true);
                        }
                      }}
                    >
                      项目：{project.name}
                    </h2>
                  )}
                </div>

                <button
                  type="button"
                  className="project-workspace__folder-path project-workspace__context-button"
                  title={project.localPath || "选择项目目录；更改后不迁移已有文件"}
                  disabled={folderBusy}
                  onClick={handlePickFolder}
                >
                  📂 {project.localPath || "选择文件夹"}
                </button>
              </div>
            </div>
          }
          projectAgentId={projectAgentId || null}
          surface="home-primary"
          isEmptyState={false}
          spaceId={project.spaceId || undefined}
        />
      </section>

      {/* 主编辑框正下方轻量胶囊收纳条（Pill Bar） */}
      <section className="project-workspace__pill-bar" data-hook="project-pill-bar">
        <button
          type="button"
          className={`project-workspace__pill-btn ${activeDrawer === "references" ? "is-active" : ""}`}
          onClick={() => setActiveDrawer(activeDrawer === "references" ? null : "references")}
          data-hook="project-references-pill"
          aria-expanded={activeDrawer === "references"}
        >
          📚 参考资料 ({referenceKeys.length})
        </button>
        <button
          type="button"
          className={`project-workspace__pill-btn ${activeDrawer === "outcomes" ? "is-active" : ""}`}
          onClick={() => setActiveDrawer(activeDrawer === "outcomes" ? null : "outcomes")}
          data-hook="project-outcomes-pill"
          aria-expanded={activeDrawer === "outcomes"}
        >
          📦 阶段成果 ({outcomeKeys.length})
        </button>

        <button
          type="button"
          className={`project-workspace__pill-btn ${activeDrawer === "music" ? "is-active" : ""}`}
          onClick={() => setActiveDrawer(activeDrawer === "music" ? null : "music")}
          data-hook="project-music-pill"
          aria-expanded={activeDrawer === "music"}
        >
          🎵 音乐
        </button>

        {archivePath ? (
          <NavLink
            to={archivePath}
            className="project-workspace__pill-link project-workspace__archive-link"
            data-hook="project-archive-link"
          >
            📄 进展文档
          </NavLink>
        ) : (
          <span className="project-workspace__pill-link is-disabled" data-hook="project-archive-link">
            📄 进展文档
          </span>
        )}

        {linkedAgents.length > 0 && (
          <label className="project-workspace__agent-select">
            Agent:
            <select
              value={projectAgentId}
              onChange={(e) => onSelectProjectAgentId(e.target.value)}
            >
              <option value="">默认 Agent</option>
              {linkedAgents.map((key) => (
                <option key={key} value={key}>
                  {project.linkedContentLabels?.[key] || key}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {/* 展开的本地音乐库抽屉：音乐库属于项目，不放在全局设置里 */}
      {activeDrawer === "music" && (
        <div className="project-workspace__drawer" data-hook="project-music-drawer">
          <div className="project-workspace__drawer-header">
            <span>本地音乐</span>
          </div>
          <LocalMusicLibraryPanel project={project} />
        </div>
      )}

      {/* 展开的参考资料抽屉 */}
      {activeDrawer === "references" && (
        <div className="project-workspace__drawer" data-hook="project-references-drawer">
          <div className="project-workspace__drawer-header">
            <h3 className="project-workspace__drawer-title">项目资料库（显式引用的参考文件）</h3>
            <div className="project-workspace__drawer-actions">
              <select
                aria-label="添加参考资料"
                defaultValue=""
                onChange={(e) => {
                  handleAddReference(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">+ 添加已有内容为资料</option>
                {items
                  .filter(
                    (item) =>
                      item.type !== "dialog" &&
                      item.type !== "agent" &&
                      item.contentKey !== project.archiveKey &&
                      !referenceKeys.includes(item.contentKey)
                  )
                  .map((item) => (
                    <option key={item.contentKey} value={item.contentKey}>
                      {item.title || item.contentKey} ({item.type})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <p className="project-workspace__card-hint">
            显式引用的参考文件。资料按需引用，对话中不会默认全文注入。
          </p>
          <div className="project-workspace__items-list">
            {referenceKeys.length === 0 ? (
              <p className="project-workspace__empty-hint">暂未添加参考资料</p>
            ) : (
              <>{referenceKeys.map(renderReferenceItem)}</>
            )}
          </div>
        </div>
      )}

      {/* 展开的阶段成果抽屉 */}
      {activeDrawer === "outcomes" && (
        <div className="project-workspace__drawer" data-hook="project-outcomes-drawer">
          <div className="project-workspace__drawer-header">
            <h3 className="project-workspace__drawer-title">项目产物（手动归入的阶段成果）</h3>
            <div className="project-workspace__drawer-actions">
              <select
                aria-label="添加阶段成果"
                defaultValue=""
                onChange={(e) => {
                  handleAddOutcome(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">+ 添加已有内容为成果</option>
                {items
                  .filter(
                    (item) =>
                      item.type !== "dialog" &&
                      item.type !== "agent" &&
                      item.contentKey !== project.archiveKey &&
                      !outcomeKeys.includes(item.contentKey)
                  )
                  .map((item) => (
                    <option key={item.contentKey} value={item.contentKey}>
                      {item.title || item.contentKey} ({item.type})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <p className="project-workspace__card-hint">
            手动归入的阶段成果，不自动包含所有生成文件。
          </p>
          <div className="project-workspace__items-list">
            {outcomeKeys.length === 0 ? (
              <p className="project-workspace__empty-hint">暂无项目产物</p>
            ) : (
              <>{outcomeKeys.map(renderOutcomeItem)}</>
            )}
          </div>
        </div>
      )}

      {/* 下方「最近项目对话」与输入框同宽、左对齐，去除多余方框 */}
      <section className="project-workspace__dialogs" data-hook="project-dialogs">
        <div className="project-workspace__dialogs-header">
          <h3 className="project-workspace__dialogs-title">最近项目对话</h3>
          {projectDialogs.length > 3 && (
            <button
              type="button"
              className="project-workspace__dialogs-toggle"
              onClick={() => setShowAllDialogs(!showAllDialogs)}
            >
              {showAllDialogs ? "收起" : `查看全部 (${projectDialogs.length})`}
            </button>
          )}
        </div>

        <div className="project-workspace__dialogs-list" role="list">
          {projectDialogs.length === 0 ? (
            <p className="project-workspace__empty-hint">暂无项目对话</p>
          ) : (
            displayedDialogs.map((dialog) => {
              const path = buildRoutableContentPath({
                contentKey: dialog.contentKey,
                type: "dialog",
                userId,
                spaceId: project.spaceId,
              });
              const dateStr = dialog.updatedAt
                ? new Date(String(dialog.updatedAt)).toLocaleDateString()
                : "";
              return (
                <NavLink
                  key={dialog.contentKey}
                  to={path}
                  className="project-workspace__dialog-item"
                  role="listitem"
                >
                  <span className="project-workspace__dialog-title">
                    💬 {dialog.title || "未命名对话"}
                  </span>
                  {dateStr && (
                    <span className="project-workspace__dialog-time">{dateStr}</span>
                  )}
                </NavLink>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

export default ProjectHomeWorkspace;
