import React, { useState, useMemo } from "react";
import { NavLink } from "app/routing";
import type { MyContentListItem } from "app/utils/myContentItems";
import { buildRoutableContentPath } from "create/space/contentKeyUtils";
import { dialogsForLocalProject, parseLocalDialogProjectBindings } from "./homeLocalProjectDialogs";
import { getIsDesktopApp } from "app/utils/env";
import {
  DESKTOP_FOLDER_PROJECTS_KEY, DESKTOP_SELECTED_FOLDER_PROJECT_KEY, DESKTOP_FOLDER_SELECTION_EVENT, DESKTOP_DIALOG_PROJECTS_KEY, addDesktopFolderProject,
  readDesktopFolderProjects, removeDesktopFolderProject, type DesktopFolderProject,
} from "./desktopFolderProjects";

/** A local-only selector; selection does not implicitly modify any running Agent cwd. */
export function DesktopFolderProjects({ items = [], userId = "", onSelectProjectScope }: { items?: readonly MyContentListItem[]; userId?: string; onSelectProjectScope?: (id: string | null, name?: string) => void }) {
  const isDesktop = getIsDesktopApp();
  const [projects, setProjects] = useState<DesktopFolderProject[]>(() => {
    if (!isDesktop || typeof window === "undefined") return [];
    try { return readDesktopFolderProjects(window.localStorage.getItem(DESKTOP_FOLDER_PROJECTS_KEY)); }
    catch { return []; }
  });
  const [selectedId, setSelectedId] = useState(() => { try { return window.localStorage.getItem(DESKTOP_SELECTED_FOLDER_PROJECT_KEY); } catch { return null; } });
  const [bindings, setBindings] = useState<Record<string, unknown>>(() => {
    try { return parseLocalDialogProjectBindings(window.localStorage.getItem(DESKTOP_DIALOG_PROJECTS_KEY)); }
    catch { return {}; }
  });
  const selectedDialogs = useMemo(() => selectedId
    ? dialogsForLocalProject(items, userId, selectedId, bindings) : [], [items, userId, selectedId, bindings]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // 本机项目绑定的是桌面壳才能访问的文件夹路径：Web 端给出说明而不是空白内容区。
  if (!isDesktop) {
    return (
      <p className="navigation-v2-context-note" role="note" data-hook="desktop-projects-unavailable">
        本机项目只在桌面端可用：它绑定本机文件夹路径，Web 端无法访问。切到「工作」可查看对话状态。
      </p>
    );
  }

  const persist = (updated: DesktopFolderProject[]) => {
    try {
      window.localStorage.setItem(DESKTOP_FOLDER_PROJECTS_KEY, JSON.stringify(updated));
      setProjects(updated);
      window.dispatchEvent(new Event(DESKTOP_FOLDER_SELECTION_EVENT));
      if (selectedId && !updated.some((project) => project.id === selectedId)) selectProject(null);
      setError("");
    } catch { setError("无法保存本机文件夹列表"); }
  };
  const selectProject = (id: string | null) => {
    try { setBindings(parseLocalDialogProjectBindings(window.localStorage.getItem(DESKTOP_DIALOG_PROJECTS_KEY))); } catch { setBindings({}); }
    try {
      if (id) window.localStorage.setItem(DESKTOP_SELECTED_FOLDER_PROJECT_KEY, id);
      else window.localStorage.removeItem(DESKTOP_SELECTED_FOLDER_PROJECT_KEY);
      setSelectedId(id);
      window.dispatchEvent(new Event(DESKTOP_FOLDER_SELECTION_EVENT));
      setError("");
    } catch { setError("无法保存所选项目"); }
  };
  const addFolder = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/desktop/pick-folder", { method: "POST" });
      if (!response.ok) throw new Error("选择目录失败");
      const result: { ok?: boolean; path?: string | null; error?: string } = await response.json();
      if (!result.ok) throw new Error(result.error || "选择目录失败");
      if (!result.path) return;
      const path = result.path;
      const parts = path.split(/[\\/]/).filter(Boolean);
      persist(addDesktopFolderProject(projects, {
        id: crypto.randomUUID(), name: parts.at(-1) || path, localPath: path,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "选择目录失败");
    } finally { setBusy(false); }
  };

  return (
    <section aria-label="本地项目" data-hook="desktop-folder-projects">
      <div><strong>本地项目</strong>{" "}
        <button type="button" disabled={busy} onClick={() => void addFolder()}>添加文件夹</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {selectedId && <button type="button" onClick={() => selectProject(null)}>清除项目选择</button>}
      {selectedId && userId && <div aria-label="项目对话" data-hook="project-dialog-list">
        <strong>项目对话（已加载）</strong>
        {selectedDialogs.length === 0 && <p>暂无已加载的关联对话。</p>}
        {selectedDialogs.map((dialog) => <div key={dialog.contentKey}>
          <NavLink to={buildRoutableContentPath({ contentKey: dialog.contentKey, type: "dialog", userId })}>{dialog.title || dialog.contentKey}</NavLink>
        </div>)}
      </div>}
      {projects.map((project) => (
        <div key={project.id} title={project.localPath}>
          <button type="button" aria-pressed={selectedId === project.id}
            onClick={() => selectProject(project.id)}>{project.name}{selectedId === project.id ? " ✓" : ""}</button>{" "}
          {onSelectProjectScope && <button type="button" onClick={() => onSelectProjectScope(project.id, project.name)}>查看工作</button>}{" "}
          <button type="button" aria-label={`移除 ${project.name}`}
            onClick={() => persist(removeDesktopFolderProject(projects, project.id))}>移除</button>
        </div>
      ))}
    </section>
  );
}
