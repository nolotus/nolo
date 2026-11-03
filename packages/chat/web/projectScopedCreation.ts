// 项目内创建内容的统一落点与关联语义。
//
// 背景（PR #209 复审 HIGH-3 / HIGH-4）：
// - HIGH-3：项目没有 space 时，创建路径曾把 `spaceId` 传成 undefined，
//   而 createPageAction / createTableAction 用 `customSpaceId ?? getCurrentSpaceId()`，
//   undefined 会隐式回退到「当前选中的 space」，把项目内容落进无关空间。
//   空串是「明确不要 space」，与 undefined 语义不同，必须显式传递。
// - HIGH-4：创建与关联项目不是原子的。项目在创建前被删除时，
//   内容会变成无主数据（关联抛错但数据已落库）。因此创建前必须重新确认
//   项目仍然存在；关联失败时不得静默，必须由调用方继续导航并明确告知用户。

import {
  DESKTOP_FOLDER_PROJECTS_KEY,
  readDesktopFolderProjects,
  type DesktopFolderProject,
} from "./desktopFolderProjects";

export interface ProjectCreationTargetReady {
  ok: true;
  /** 目标项目 id；null 表示本次创建不关联任何项目。 */
  projectId: string | null;
  /**
   * 落点 space：
   * - `""`：显式「无 space」。项目没有 space 时必须用它，绝不能传 undefined
   *   （undefined 会被 createPageAction / createTableAction 回退成当前 space）。
   * - `undefined`：调用方未指定，沿用既有语义（页面/表格回退当前 space，对话无 space）。
   */
  spaceId: string | undefined;
}

export interface ProjectCreationTargetMissing {
  ok: false;
  /** 项目已被删除（或 storage 不可用，无法确认也无法关联）。 */
  reason: "project-missing";
  projectId: string;
}

export type ProjectCreationTarget =
  | ProjectCreationTargetReady
  | ProjectCreationTargetMissing;

/** 重新读取最新项目列表，确认项目仍然存在（不信任调用方的快照）。 */
export function projectStillExists(
  storage: Pick<Storage, "getItem"> | null,
  projectId: string,
): boolean {
  if (!storage) return false;
  try {
    const projects = readDesktopFolderProjects(
      storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY),
    );
    return projects.some((p) => p.id === projectId);
  } catch {
    return false;
  }
}

/**
 * 解析一次「项目内创建」的落点。
 *
 * - 无项目：保持调用方原有语义（fallbackSpaceId，未指定则为 undefined）。
 * - 项目仍在：spaceId 取项目自己的 space；项目没有 space 时显式返回空串。
 * - 项目已被删除：返回 ok:false，调用方必须在创建任何内容之前中止，
 *   否则会留下无法关联、也无法回收的无主数据。
 */
export function resolveProjectCreationTarget({
  storage,
  project,
  fallbackSpaceId,
  requestedProjectId,
}: {
  storage: Pick<Storage, "getItem"> | null;
  project: DesktopFolderProject | null | undefined;
  fallbackSpaceId?: string | null;
  /** 显式请求的项目，优先于解析快照；缺失时不能降级为无项目。 */
  requestedProjectId?: string | null;
}): ProjectCreationTarget {
  // 三种情况：① 无项目上下文沿用 fallback；② 请求的项目存在，取最新
  // 项目的 space（null 显式转为空串）；③ 请求了已删除项目，创建前中止。
  if (requestedProjectId) {
    try {
      project = readDesktopFolderProjects(storage?.getItem(DESKTOP_FOLDER_PROJECTS_KEY) ?? null)
        .find((candidate) => candidate.id === requestedProjectId);
    } catch {
      project = null;
    }
    if (!project) {
      return { ok: false, reason: "project-missing", projectId: requestedProjectId };
    }
  }
  if (!project) {
    return {
      ok: true,
      projectId: null,
      spaceId: fallbackSpaceId ?? undefined,
    };
  }
  // 项目必须仍然存在才允许创建；storage 不可用时同样中止（无法确认也无法关联）。
  if (!projectStillExists(storage, project.id)) {
    return { ok: false, reason: "project-missing", projectId: project.id };
  }
  return {
    ok: true,
    projectId: project.id,
    // 空串 = 明确「无 space」；undefined 会被 action 回退成当前选中的 space。
    spaceId: project.spaceId ?? "",
  };
}

/**
 * 调用方明确要求「在项目 X 内创建」，但项目记录已经不在列表里
 * → 项目已被删除。此时必须提前失败，而不是把内容默默落进当前 space。
 */
export function isRequestedProjectMissing({
  storage,
  projectScopeId,
}: {
  storage: Pick<Storage, "getItem"> | null;
  projectScopeId?: string | null;
}): boolean {
  if (!projectScopeId) return false;
  if (!storage) return true;
  try {
    const projects = readDesktopFolderProjects(
      storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY),
    );
    return !projects.some((p) => p.id === projectScopeId);
  } catch {
    return true;
  }
}

export interface ProjectLinkResult {
  linked: boolean;
  /** 关联失败时的原始错误。 */
  error?: unknown;
}

/**
 * 关联已创建内容到项目。关联失败不抛错：
 * 内容已经落库，抛错会让调用方误判成「创建失败」，用户可能再点一次造成重复创建。
 * 调用方拿到 linked:false 后必须继续导航到已创建内容，并明确告知「已创建但未关联」。
 */
export function tryLinkToProject(
  projectId: string | null,
  link: () => void,
): ProjectLinkResult {
  if (!projectId) return { linked: true };
  try {
    link();
    return { linked: true };
  } catch (error) {
    return { linked: false, error };
  }
}
