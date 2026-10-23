import React, { useState, useMemo, useEffect, useRef } from "react";
import { NavLink } from "app/routing";
import type { MyContentListItem } from "app/utils/myContentItems";
import { buildRoutableContentPath } from "create/space/contentKeyUtils";
import { dialogsForLocalProject, parseLocalDialogProjectBindings } from "./homeLocalProjectDialogs";
import { getIsDesktopApp } from "app/utils/env";
import {
  DESKTOP_FOLDER_PROJECTS_KEY, DESKTOP_SELECTED_FOLDER_PROJECT_KEY, DESKTOP_FOLDER_SELECTION_EVENT, DESKTOP_DIALOG_PROJECTS_KEY, addDesktopFolderProject,
  readDesktopFolderProjects, type DesktopFolderProject,
} from "./desktopFolderProjects";

/** A local-only selector; selection does not implicitly modify any running Agent cwd. */
export function DesktopFolderProjects({ items = [], userId = "", onSelectProjectScope, createRequest = 0 }: { createRequest?: number; items?: readonly MyContentListItem[]; userId?: string; onSelectProjectScope?: (id: string | null, name?: string) => void }) {
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
  const [creating, setCreating] = useState(false);
  const [projectName, setProjectName] = useState("");
  const lastCreateRequest = useRef(0);
  useEffect(() => {
    if (isDesktop && createRequest > lastCreateRequest.current) {
      lastCreateRequest.current = createRequest;
      setCreating(true);
      setError("");
    }
  }, [isDesktop, createRequest]);
  if (!isDesktop) return null;

  const persist = (updated: DesktopFolderProject[]) => {
    try {
      window.localStorage.setItem(DESKTOP_FOLDER_PROJECTS_KEY, JSON.stringify(updated));
      setProjects(updated);
      window.dispatchEvent(new Event(DESKTOP_FOLDER_SELECTION_EVENT));
      if (selectedId && !updated.some((project) => project.id === selectedId)) selectProject(null);
      setError("");
      return true;
    } catch { setError("无法保存本机文件夹列表；已创建的目录仍保留，可用「打开已有目录」重新添加"); return false; }
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
  const addFolder = async (create = false) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/desktop/pick-folder", create ? {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: projectName.trim() }),
      } : { method: "POST" });
      const result: { ok?: boolean; path?: string | null; error?: string } = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "选择目录失败");
      if (!result.path) return;
      const path = result.path;
      const parts = path.split(/[\\/]/).filter(Boolean);
      if (persist(addDesktopFolderProject(projects, {
        id: crypto.randomUUID(), name: parts.at(-1) || path, localPath: path,
      }))) {
        setCreating(false);
        setProjectName("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "选择目录失败");
    } finally { setBusy(false); }
  };

  return (
    <section aria-label="本地项目" data-hook="desktop-folder-projects" className="desktop-folder-projects">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <strong>项目</strong>
        <button type="button" aria-label="新建项目" disabled={busy}
          onClick={() => { setCreating(true); setError(""); }}>+ 新建项目</button>
      </div>
      {creating && <form onSubmit={(event) => { event.preventDefault(); if (!busy && projectName.trim()) void addFolder(true); }}>
        <label>项目名称<input autoFocus value={projectName} placeholder="输入新目录名称" maxLength={120}
          disabled={busy} onChange={(event) => setProjectName(event.target.value)} /></label>
        <p>选择父目录后，将在其中创建同名的新目录。</p>
        <button type="submit" disabled={busy || !projectName.trim()}>选择父目录并创建</button>{" "}
        <button type="button" disabled={busy} onClick={() => setCreating(false)}>取消</button>
      </form>}
      {projects.length === 0 && !creating && <div>
        <p>还没有项目</p>
        <button type="button" disabled={busy} onClick={() => { setCreating(true); setError(""); }}>+ 新建项目</button>
      </div>}
      <button type="button" disabled={busy} onClick={() => void addFolder()}>打开已有目录</button>
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
          {onSelectProjectScope && <button type="button" onClick={() => onSelectProjectScope(project.id, project.name)}>查看工作</button>}
        </div>
      ))}
    </section>
  );
}
