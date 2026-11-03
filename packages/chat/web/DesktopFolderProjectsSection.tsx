import React, { useState, useEffect, useRef } from "react";
import { NavLink } from "app/routing";
import { MenuPopover } from "render/web/ui/MenuPopover";
import { Menu, MenuItem } from "render/web/ui/Menu";
import type { MyContentListItem } from "app/utils/myContentItems";
import { buildRoutableContentPath } from "create/space/contentKeyUtils";
import { dialogsForLocalProject, parseLocalDialogProjectBindings } from "./homeLocalProjectDialogs";
import { getIsDesktopApp } from "app/utils/env";
import { DESKTOP_FOLDER_PROJECTS_KEY, DESKTOP_SELECTED_FOLDER_PROJECT_KEY, DESKTOP_FOLDER_SELECTION_EVENT, DESKTOP_DIALOG_PROJECTS_KEY, addDesktopFolderProject, readDesktopFolderProjects, updateDesktopProject, createDesktopProjectGroup, assignDesktopProjectContentGroup, type DesktopFolderProject } from "./desktopFolderProjects";
import { requestPickFolderPath } from "./desktopFolderProjectsPicker";
export { requestPickFolderPath };
import "./desktopFolderProjects.css";

export function DesktopFolderProjects({ items = [], userId = "", onSelectProjectScope, onOpenProject, spaceId = null, createRequest = 0 }: {
  spaceId?: string | null; createRequest?: number; items?: readonly MyContentListItem[]; userId?: string;
  onSelectProjectScope?: (id: string | null, name?: string) => void;
  onOpenProject?: (project: DesktopFolderProject) => void;
}) {
  const isDesktop = getIsDesktopApp();
  const [projects, setProjects] = useState(() => {
    try { return isDesktop ? readDesktopFolderProjects(window.localStorage.getItem(DESKTOP_FOLDER_PROJECTS_KEY)) : []; } catch { return []; }
  });
  const [selectedId, setSelectedId] = useState<string | null>(() => { try { return window.localStorage.getItem(DESKTOP_SELECTED_FOLDER_PROJECT_KEY); } catch { return null; } });
  const [projectMenu, setProjectMenu] = useState<{ projectId: string; anchor: HTMLElement } | null>(null);
  const [groupProjectId, setGroupProjectId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [folder, setFolder] = useState("");
  const [folderRequired, setFolderRequired] = useState(false);
  const [linked, setLinked] = useState<string[]>([]);
  const lastCreateRequest = useRef(0);
  const folderRequestInFlight = useRef(false);
  const groupCommitInFlight = useRef(false);
  const [, refresh] = useState(0);
  useEffect(() => {
    if (isDesktop && createRequest > lastCreateRequest.current) { lastCreateRequest.current = createRequest; setCreating(true); setFolderRequired(false); setInstructions(""); setError(""); }
  }, [isDesktop, createRequest]);
  useEffect(() => {
    const sync = () => {
      setProjects(readDesktopFolderProjects(window.localStorage.getItem(DESKTOP_FOLDER_PROJECTS_KEY)));
      setSelectedId(window.localStorage.getItem(DESKTOP_SELECTED_FOLDER_PROJECT_KEY));
      refresh((v) => v + 1);
    };
    window.addEventListener?.(DESKTOP_FOLDER_SELECTION_EVENT, sync);
    window.addEventListener?.("nolo-user-data-updated", sync);
    return () => { window.removeEventListener?.(DESKTOP_FOLDER_SELECTION_EVENT, sync); window.removeEventListener?.("nolo-user-data-updated", sync); };
  }, []);
  if (!isDesktop) return null;

  const open = (project: DesktopFolderProject) => {
    try {
      window.localStorage.setItem(DESKTOP_SELECTED_FOLDER_PROJECT_KEY, project.id);
      setSelectedId(project.id);
      window.dispatchEvent(new Event(DESKTOP_FOLDER_SELECTION_EVENT));
      onOpenProject?.(project);
    } catch { setError("无法打开项目，请检查本机存储是否可用"); }
  };
  const pickFolder = async (fromFolder = false) => {
    if (folderRequestInFlight.current) return;
    folderRequestInFlight.current = true;
    setBusy(true); setError("");
    try {
      const path = await requestPickFolderPath();
      if (path) {
        const folderName = path.split(/[\\/]/).filter(Boolean).at(-1) || path;
        setFolder(path);
        if (fromFolder) {
          setFolderRequired(true);
          setInstructions("");
        }
        if (fromFolder || !name.trim()) setName(folderName);
        setCreating(true);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "选择文件夹失败"); }
    finally { folderRequestInFlight.current = false; setBusy(false); }
  };
  const createProject = (projectName = name, projectFolder = folder) => {
    if (!projectName.trim()) return;
    try {
      const existing = readDesktopFolderProjects(window.localStorage.getItem(DESKTOP_FOLDER_PROJECTS_KEY));
      if (projectFolder && existing.some((p) => p.localPath === projectFolder)) throw new Error("该文件夹已关联其他项目，请直接打开已有项目");

      const trimmedInstructions = instructions.trim();
      const project: DesktopFolderProject = {
        id: crypto.randomUUID(),
        name: projectName.trim(),
        localPath: projectFolder,
        ...(trimmedInstructions ? { instructions: trimmedInstructions } : {}),
        linkedContentKeys: linked,
        linkedContentLabels: Object.fromEntries(items.filter((item) => linked.includes(item.contentKey)).map((item) => [item.contentKey, item.title || item.contentKey])),
        spaceId,
      } as DesktopFolderProject;
      const updated = addDesktopFolderProject(existing, project);
      window.localStorage.setItem(DESKTOP_FOLDER_PROJECTS_KEY, JSON.stringify(updated));
      setProjects(updated); setCreating(false); setName(""); setFolder(""); setInstructions(""); setLinked([]); setError("");
      open(project);
    } catch (e) { setError(e instanceof Error ? e.message : "无法保存项目"); }
  };
  const finishGroup = () => {
    if (!groupProjectId || groupCommitInFlight.current) return;
    const title = groupName.trim();
    if (!title) { setGroupProjectId(null); setGroupName(""); return; }
    groupCommitInFlight.current = true;
    try {
      createDesktopProjectGroup(window.localStorage, groupProjectId, title);
      setProjects(readDesktopFolderProjects(window.localStorage.getItem(DESKTOP_FOLDER_PROJECTS_KEY)));
      setGroupProjectId(null);
      setGroupName("");
      setError("");
    } catch (e) {
      groupCommitInFlight.current = false;
      setError(e instanceof Error ? e.message : "创建分组失败");
    }
  };
  const linkFor = (key: string, type: string, projectSpace?: string | null) => buildRoutableContentPath({ contentKey: key, type, userId, spaceId: projectSpace });
  let bindings: Record<string, unknown> = {};
  try { bindings = parseLocalDialogProjectBindings(window.localStorage.getItem(DESKTOP_DIALOG_PROJECTS_KEY)); } catch { /* unavailable storage */ }
  return <section aria-label="本地项目" data-hook="desktop-folder-projects" className="desktop-folder-projects">
    <header><button type="button" disabled={busy} onClick={() => { setCreating(true); setFolderRequired(false); setFolder(""); setName(""); setInstructions(""); setError(""); }}>新建项目</button><button type="button" disabled={busy} onClick={() => void pickFolder(true)}>从文件夹创建</button></header>
    {creating && <form onSubmit={(e) => { e.preventDefault(); createProject(); }}>
      <label>项目名称<input autoFocus value={name} placeholder="输入项目名称" maxLength={120} onChange={(e) => setName(e.target.value)} /></label>
      <label>项目指令（可选）<textarea value={instructions} placeholder="描述项目目标、你想在这里完成的事情，以及希望达成的结果。也可以补充背景、要求和注意事项。" rows={3} onChange={(e) => setInstructions(e.target.value)} /></label>
      <div className="desktop-folder-projects__folder">
        <span>{folderRequired ? "项目文件夹" : "项目文件夹（可选）"}</span>
        {folder && <div className="desktop-folder-projects__folder-path" title={folder}>{folder}</div>}
        <button type="button" disabled={busy} onClick={() => void pickFolder()}>{folder ? "更换文件夹" : "选择文件夹"}</button>
        {folder && !folderRequired && <button type="button" disabled={busy} onClick={() => setFolder("")}>不绑定文件夹</button>}
        <small>{folderRequired ? "本地执行使用此目录，代码等文件产物默认保存在这里。" : "绑定后，本地执行使用此目录，代码等文件产物默认保存在这里；未绑定时仍可创建项目。"}</small>
      </div>

      <details><summary>关联内容{linked.length ? `（${linked.length}）` : "（可选）"}</summary>
        <div className="desktop-folder-projects__picker">{items.filter((item) => item.type !== "dialog").map((item) => <label key={item.contentKey}>
          <input type="checkbox" checked={linked.includes(item.contentKey)} onChange={(e) => setLinked((current) => e.target.checked ? [...current, item.contentKey] : current.filter((key) => key !== item.contentKey))} />
          <span>{item.title || item.contentKey}<small>{item.type}</small></span>
        </label>)}{!items.some((item) => item.type !== "dialog") && <small>暂无可关联的已加载内容</small>}</div>
      </details>
      <footer className="desktop-folder-projects__actions"><button type="button" onClick={() => { setCreating(false); setInstructions(""); }}>取消</button><button type="submit" className="desktop-folder-projects__submit" disabled={!name.trim() || busy}>创建项目</button></footer>
    </form>}
    {!projects.length && !creating && <p>还没有项目</p>}
    {error && <p role="alert">{error}</p>}
    {projects.filter((project) => !spaceId || project.spaceId === spaceId).map((project) => {
      const dialogs = dialogsForLocalProject(items, userId, project.id, bindings);
      const groups = project.groups ?? [];
      const contentKeys = [...new Set([...dialogs.map((dialog) => dialog.contentKey), ...(project.linkedContentKeys ?? []), ...(project.outcomeKeys ?? [])])];
      const renderContent = (key: string) => {
        const item = items.find((entry) => entry.contentKey === key);
        const groupId = groups.find((group) => group.contentKeys.includes(key))?.id ?? "";
        return <div key={key} className="desktop-folder-projects__content-row">
          <NavLink to={linkFor(key, item?.type || (key.startsWith("dialog-") ? "dialog" : "page"), project.spaceId)}>{item?.title || project.linkedContentLabels?.[key] || key}</NavLink>
          {!!groups.length && <select aria-label={"内容分组 " + key} value={groupId} onChange={(event) => {
            try { assignDesktopProjectContentGroup(window.localStorage, project.id, key, event.target.value || null); setProjects(readDesktopFolderProjects(window.localStorage.getItem(DESKTOP_FOLDER_PROJECTS_KEY))); }
            catch (e) { setError(e instanceof Error ? e.message : "调整分组失败"); }
          }}><option value="">未分组</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>}
        </div>;
      };
      return <div key={project.id} className="desktop-folder-projects__project">
        <div className="desktop-folder-projects__project-heading">
        <button type="button" className="desktop-folder-projects__name" aria-pressed={selectedId === project.id} onClick={() => open(project)} title={project.localPath || project.name}>{project.name}</button>
          <button type="button" className="desktop-folder-projects__more-button" aria-label={project.name + " 更多"} aria-haspopup="menu" aria-expanded={projectMenu?.projectId === project.id} onClick={(event) => setProjectMenu({ projectId: project.id, anchor: event.currentTarget })}>⋯</button>
        </div>
        <div className="desktop-folder-projects__children">
          {groupProjectId === project.id && <div className="desktop-folder-projects__group-draft"><span aria-hidden="true">▾</span><input autoFocus className="desktop-folder-projects__group-title-input" aria-label="分组名称" placeholder="分组名称" value={groupName} onChange={(event) => setGroupName(event.target.value)} onBlur={finishGroup} onKeyDown={(event) => {
            if (event.nativeEvent?.isComposing) return;
            if (event.key === "Enter") { event.preventDefault(); finishGroup(); }
            if (event.key === "Escape") { groupCommitInFlight.current = true; setGroupProjectId(null); setGroupName(""); }
          }} /></div>}
          {contentKeys.filter((key) => !groups.some((group) => group.contentKeys.includes(key))).map(renderContent)}
          {groups.map((group) => <details key={group.id} className="desktop-folder-projects__group" open><summary>{group.name}</summary>{contentKeys.filter((key) => group.contentKeys.includes(key)).map(renderContent)}</details>)}
          {selectedId === project.id && !project.localPath && <button type="button" disabled={busy} onClick={async () => {
            setBusy(true); setError("");
            try {
              const response = await fetch("/api/desktop/pick-folder", { method: "POST" });
              const result = await response.json();
              if (!response.ok || !result.ok) throw new Error(result.error || "选择文件夹失败");
              if (result.path) {
                updateDesktopProject(window.localStorage, project.id, { localPath: result.path });
                setProjects(readDesktopFolderProjects(window.localStorage.getItem(DESKTOP_FOLDER_PROJECTS_KEY)));
              }
            } catch (e) { setError(e instanceof Error ? e.message : "无法保存文件夹"); }
            finally { setBusy(false); }
          }}>选择本地文件夹</button>}
        </div>
      </div>;
    })}
    {projectMenu && <MenuPopover triggerRef={{ current: projectMenu.anchor }} isOpen onOpenChange={(open) => { if (!open) setProjectMenu(null); }} placement="bottom end"><Menu aria-label="项目操作"><MenuItem id="new-group" onAction={() => { groupCommitInFlight.current = false; setGroupProjectId(projectMenu.projectId); setGroupName(""); setProjectMenu(null); }}>新建分组</MenuItem></Menu></MenuPopover>}
  </section>;
}
