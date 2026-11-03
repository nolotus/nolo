export interface DesktopFolderProjectGroup {
  id: string;
  name: string;
  contentKeys: string[];
}

/** Device-local desktop folder list, separate from Space and cloud Project data. */
export interface DesktopFolderProject {
  id: string;
  name: string;
  localPath: string;
  spaceId?: string | null;
  linkedContentLabels?: Record<string, string>;
  linkedContentKeys?: string[];
  archiveKey?: string;
  outcomeKeys?: string[];
  groups?: DesktopFolderProjectGroup[];
  instructions?: string;
}

export const DESKTOP_FOLDER_PROJECTS_KEY = "nolo:desktop-folder-projects:v1";

export function updateDesktopProject(
  storage: Pick<Storage, "getItem" | "setItem">,
  projectId: string,
  patch: Partial<Pick<DesktopFolderProject, "name" | "localPath" | "spaceId" | "linkedContentKeys" | "linkedContentLabels" | "archiveKey" | "outcomeKeys" | "groups" | "instructions">>,
): DesktopFolderProject {
  const raw = storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY);
  if (raw && !Array.isArray(JSON.parse(raw))) throw new Error("项目记录无法读取");
  const projects = readDesktopFolderProjects(raw);
  if (raw && JSON.parse(raw).length !== projects.length) throw new Error("项目记录包含无效或重复项，未覆盖原记录");
  const current = projects.find((p) => p.id === projectId);
  if (!current) throw new Error("项目不存在");
  if (patch.instructions !== undefined && typeof patch.instructions !== "string") {
    throw new Error("项目指令格式错误");
  }
  const updated = { ...current, ...patch, id: current.id };
  if (!updated.name.trim()) throw new Error("请填写项目名称");
  storage.setItem(DESKTOP_FOLDER_PROJECTS_KEY, JSON.stringify(projects.map((p) => p.id === projectId ? updated : p)));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DESKTOP_FOLDER_SELECTION_EVENT));
  return updated;
}

export function selectDesktopProject(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, projectId: string | null): void {
  if (projectId && !readDesktopFolderProjects(storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY)).some((p) => p.id === projectId)) throw new Error("项目不存在");
  if (projectId) storage.setItem(DESKTOP_SELECTED_FOLDER_PROJECT_KEY, projectId);
  else storage.removeItem(DESKTOP_SELECTED_FOLDER_PROJECT_KEY);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DESKTOP_FOLDER_SELECTION_EVENT));
}

export function readDesktopFolderProjects(raw: string | null): DesktopFolderProject[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const ids = new Set<string>();
    return value.filter((item): item is DesktopFolderProject =>
      !!item && typeof item === "object" && typeof item.id === "string" &&
      !!item.id.trim() && typeof item.name === "string" && !!item.name.trim() &&
      typeof item.localPath === "string" &&
      (item.linkedContentKeys === undefined || (Array.isArray(item.linkedContentKeys) && item.linkedContentKeys.every((key: unknown) => typeof key === "string"))) &&
      (item.outcomeKeys === undefined || (Array.isArray(item.outcomeKeys) && item.outcomeKeys.every((key: unknown) => typeof key === "string"))) &&
      (item.archiveKey === undefined || typeof item.archiveKey === "string") &&
      (item.groups === undefined || (Array.isArray(item.groups) && item.groups.every((g: unknown) =>
        !!g && typeof g === "object" &&
        typeof (g as any).id === "string" && !!(g as any).id.trim() &&
        typeof (g as any).name === "string" && !!(g as any).name.trim() &&
        Array.isArray((g as any).contentKeys) && (g as any).contentKeys.every((k: unknown) => typeof k === "string")
      ))))
      .map((item) => {
        if (item.instructions !== undefined && typeof item.instructions !== "string") {
          const { instructions: _bad, ...rest } = item;
          return rest as DesktopFolderProject;
        }
        return item;
      })
      .filter((item) => {
        const key = item.localPath.trim() ? `path:${item.localPath}` : `id:${item.id}`;
        if (seen.has(key) || ids.has(item.id)) return false;
        ids.add(item.id);
        seen.add(key);
        return true;
      });
  } catch {
    return [];
  }
}

export function createDesktopProjectGroup(
  storage: Pick<Storage, "getItem" | "setItem">,
  projectId: string,
  name: string,
): DesktopFolderProject {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("请填写分组名称");
  const raw = storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY);
  const projects = readDesktopFolderProjects(raw);
  const current = projects.find((p) => p.id === projectId);
  if (!current) throw new Error("项目不存在");
  const existingGroups = current.groups ?? [];
  const newGroup: DesktopFolderProjectGroup = {
    id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    contentKeys: [],
  };
  return updateDesktopProject(storage, projectId, {
    groups: [...existingGroups, newGroup],
  });
}

export function assignDesktopProjectContentGroup(
  storage: Pick<Storage, "getItem" | "setItem">,
  projectId: string,
  contentKey: string,
  groupId: string | null,
): DesktopFolderProject {
  const raw = storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY);
  const projects = readDesktopFolderProjects(raw);
  const current = projects.find((p) => p.id === projectId);
  if (!current) throw new Error("项目不存在");
  const groups = current.groups ?? [];
  if (groupId !== null && !groups.some((g) => g.id === groupId)) {
    throw new Error("分组不存在");
  }
  const nextGroups = groups.map((g) => {
    const filteredKeys = g.contentKeys.filter((k) => k !== contentKey);
    if (g.id === groupId) {
      return { ...g, contentKeys: [...filteredKeys, contentKey] };
    }
    return { ...g, contentKeys: filteredKeys };
  });
  return updateDesktopProject(storage, projectId, { groups: nextGroups });
}

/** Duplicate folder selection is idempotent; never replace IDs used by existing dialogs. */
export function addDesktopFolderProject(
  current: readonly DesktopFolderProject[], next: DesktopFolderProject,
): DesktopFolderProject[] {
  if (!next.id.trim() || !next.name.trim()) return [...current];
  if (current.some((p) => (!!next.localPath.trim() && p.localPath === next.localPath) || p.id === next.id)) return [...current];
  return [...current, next];
}

export function removeDesktopFolderProject(
  current: readonly DesktopFolderProject[], projectId: string,
): DesktopFolderProject[] {
  return current.filter((project) => project.id !== projectId);
}

/** A selection is a composer preference, never a mutation of an existing Run. */
export const DESKTOP_SELECTED_FOLDER_PROJECT_KEY = "nolo:desktop-selected-folder-project:v1";
export const DESKTOP_FOLDER_SELECTION_EVENT = "nolo:desktop-folder-selection";

export function resolveSelectedDesktopFolder(
  projects: readonly DesktopFolderProject[], selectedId: string | null,
): DesktopFolderProject | null {
  return projects.find((project) => project.id === selectedId) ?? null;
}

/** One snapshot of the composer choice; cwd and Dialog binding must never disagree. */
export function readSelectedDesktopFolderProject(
  storage: Pick<Storage, "getItem">,
): DesktopFolderProject | null {
  return resolveSelectedDesktopFolder(
    readDesktopFolderProjects(storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY)),
    storage.getItem(DESKTOP_SELECTED_FOLDER_PROJECT_KEY),
  );
}

/** Device-local composer choice. Missing/removed project never falls back to a stale path. */
export function readSelectedDesktopFolderPath(storage: Pick<Storage, "getItem">): string | null {
  return readSelectedDesktopFolderProject(storage)?.localPath ?? null;
}

/** Per-dialog device-local binding. A missing Project must not silently select a different folder. */
export const DESKTOP_DIALOG_PROJECTS_KEY = "nolo:desktop-dialog-projects:v1";
export function readDialogProjectId(storage: Pick<Storage, "getItem">, dialogKey: string): string | null {
  try {
    const raw = storage.getItem(DESKTOP_DIALOG_PROJECTS_KEY);
    const records: unknown = raw ? JSON.parse(raw) : {};
    if (!records || typeof records !== "object" || Array.isArray(records)) return null;
    const id = (records as Record<string, unknown>)[dialogKey];
    return typeof id === "string" && id.trim() ? id : null;
  } catch { return null; }
}
export function bindDialogToProject(
  storage: Pick<Storage, "getItem" | "setItem">, dialogKey: string, projectId: string,
): void {
  if (!dialogKey.trim() || !projectId.trim()) throw new Error("Invalid dialog/project binding");
  const raw = storage.getItem(DESKTOP_DIALOG_PROJECTS_KEY);
  let records: Record<string, string> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      records = Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === "string"));
    }
  } catch { /* Keep the new binding if old JSON is malformed. */ }
  storage.setItem(DESKTOP_DIALOG_PROJECTS_KEY, JSON.stringify({ ...records, [dialogKey]: projectId }));
}
export function readDialogFolderPath(storage: Pick<Storage, "getItem">, dialogKey: string): string | null {
  const id = readDialogProjectId(storage, dialogKey);
  return resolveSelectedDesktopFolder(
    readDesktopFolderProjects(storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY)), id,
  )?.localPath ?? null;
}

/**
 * Bind a freshly created Dialog to the composer's selected Project.
 * Reads the selection in one snapshot, so the persisted binding and the cwd sent with
 * the first turn cannot disagree. Returns the bound Project, or null when nothing valid
 * is selected — an unselected/removed Project must not create a binding to a stale id.
 */
export function bindSelectedProjectToDialog(
  storage: Pick<Storage, "getItem" | "setItem">, dialogKey: string,
): DesktopFolderProject | null {
  if (!dialogKey.trim()) return null;
  const project = readSelectedDesktopFolderProject(storage);
  if (!project) return null;
  bindDialogToProject(storage, dialogKey, project.id);
  return project;
}

/**
 * The desktop shell's designated default workspace: `NOLO_DESKTOP_CWD` override,
 * else the user home dir (see packages/desktop/src/bun/index.ts). It is the same
 * fallback the first message of a /chat composer uses, so a Dialog must resolve to
 * it too — otherwise the first turn and every later turn would run in different roots.
 */
export function readDesktopDefaultWorkspacePath(): string | null {
  if (typeof window === "undefined") return null;
  return window.__NOLO_DESKTOP_CWD__?.trim() || null;
}

/**
 * One resolution for "which directory does this Dialog run in".
 * - bound Project resolves → its local path;
 * - bound Project is gone → `missing: true`, never a fallback to another folder
 *   or the default workspace (the composer must block instead);
 * - no binding at all → the desktop default workspace, matching first-message cwd.
 */
export function resolveDialogWorkspaceFolder(
  storage: Pick<Storage, "getItem">, dialogKey: string,
): { cwd: string | null; projectId: string | null; missing: boolean } {
  const projectId = readDialogProjectId(storage, dialogKey);
  const projectPath = projectId
    ? resolveSelectedDesktopFolder(
        readDesktopFolderProjects(storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY)),
        projectId,
      )?.localPath ?? null
    : null;
  if (projectId) {
    const exists = readDesktopFolderProjects(storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY)).some((p) => p.id === projectId);
    return { cwd: projectPath || null, projectId, missing: !exists };
  }
  return { cwd: readDesktopDefaultWorkspacePath(), projectId: null, missing: false };
}
