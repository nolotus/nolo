import { useEffect, useState } from "react";
import { useLocation } from "app/routing";
import { getIsDesktopApp } from "app/utils/env";
import {
  DESKTOP_FOLDER_PROJECTS_KEY,
  DESKTOP_FOLDER_SELECTION_EVENT,
  readDesktopFolderProjects,
  readSelectedDesktopFolderProject,
  readDialogProjectId,
  updateDesktopProject,
  type DesktopFolderProject,
} from "./desktopFolderProjects";

export interface ActiveProjectScopeResolutionOptions {
  location: { pathname: string; search: string };
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  projectScopeId?: string | null;
  isDesktop?: boolean;
}

/**
 * 从 URL 中提取可能的 dialogKey：
 * 1. buildScopedPagePath 生成的真实路由：/dialog-... 或 /space/:spaceId/dialog-...
 * 2. 传统 chat 路由：/chat/:dialogKey 或 /chat?dialog=...
 */
export function extractDialogKeyFromLocation(pathname: string, search: string): string | null {
  try {
    const params = new URLSearchParams(search);
    const queryDialog = params.get("dialog");
    if (queryDialog) return queryDialog;

    const segments = pathname.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = decodeURIComponent(segments[i]);
      if (seg.startsWith("dialog-")) {
        return seg;
      }
    }
    if (segments.length >= 2 && segments[0] === "chat") {
      return decodeURIComponent(segments[1]);
    }
  } catch {
    return null;
  }
  return null;
}

/** 只有首页项目路由使用 project query；空值及其他路由不构成项目请求。 */
export function extractProjectIdFromLocation(pathname: string, search: string): string | null {
  if (pathname !== "/") return null;
  return new URLSearchParams(search).get("project") || null;
}

/**
 * 亲核有效 project scope：
 * 1. 非桌面环境不生效（return null）；
 * 2. storage 异常不崩渲染（安全回退 null）；
 * 3. 全局 work / space / favorites / explore 绝对不从残留 localStorage 误归项目；
 * 4. 当前对话绑定优先于残留 sidebarScope；
 * 5. 真实路由支持：包含 buildScopedPagePath (/dialog-... /space/:spaceId/dialog-...) 及 /chat 路径；
 * 6. 项目页路由 /?project= 且选中匹配；
 * 7. 仅在非对话视图下，项目列表筛选才通过 projectScopeId 显式生效。
 */
export function resolveActiveProjectScope({
  location,
  storage: storageParam,
  projectScopeId,
  isDesktop: isDesktopOption,
}: ActiveProjectScopeResolutionOptions): DesktopFolderProject | null {
  const isDesktop = isDesktopOption !== undefined ? isDesktopOption : getIsDesktopApp();
  if (!isDesktop) return null;

  try {
    const storage = storageParam ?? (typeof window !== "undefined" ? window.localStorage : null);
    if (!storage) return null;

    const rawProjects = storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY);
    const projects = readDesktopFolderProjects(rawProjects);
    if (projects.length === 0) return null;

    const { pathname, search } = location;

    // 1. 全局特定视图排除：/favorites, /explore 永远不误归项目
    if (pathname === "/favorites" || pathname === "/explore") {
      return null;
    }

    // 2. 当前对话路由识别（buildScopedPagePath 或 /chat）：对话绑定优先于残留 sidebarScope
    const dialogKey = extractDialogKeyFromLocation(pathname, search);
    if (dialogKey) {
      const boundId = readDialogProjectId(storage, dialogKey);
      if (boundId) {
        const boundProject = projects.find((p) => p.id === boundId);
        if (boundProject) return boundProject;
      }
      // 当前处于明确的对话路由，但该对话未关联任何项目，绝不被残留 sidebarScope 误归项目
      return null;
    }

    // 3. 非对话的空间路由：/space/... 永远不从残留 localStorage 误归项目
    if (pathname.startsWith("/space/") || pathname === "/space") {
      return null;
    }

    // 4. 项目页路由：/?project=... 且与选中项目匹配
    if (pathname === "/") {
      const routeProjectId = extractProjectIdFromLocation(pathname, search);
      if (routeProjectId) {
        const selected = readSelectedDesktopFolderProject(storage);
        if (selected && selected.id === routeProjectId) {
          return selected;
        }
        return null;
      }
    }

    // 5. 项目列表筛选（仅在非对话、非空间时通过 Sidebar 明确传递的 projectScopeId 生效）
    if (projectScopeId) {
      const matched = projects.find((p) => p.id === projectScopeId);
      if (matched) return matched;
    }

    // 6. 全局 work（pathname === "/" 且无 ?project=）等一律返回 null，绝不读取残留 localStorage
    return null;
  } catch {
    return null;
  }
}

/**
 * 将创建的内容（page / table 等）最新读合并到目标项目的 linkedContentKeys 中。
 * 持久化失败时明确抛出异常，不假称成功。
 */
export function linkContentToProject(
  storage: Pick<Storage, "getItem" | "setItem">,
  projectId: string,
  contentKey: string,
): DesktopFolderProject {
  if (!contentKey || typeof contentKey !== "string") {
    throw new Error("Invalid contentKey for project link");
  }
  const raw = storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY);
  const projects = readDesktopFolderProjects(raw);
  const current = projects.find((p) => p.id === projectId);
  if (!current) {
    throw new Error(`项目不存在，关联失败: ${projectId}`);
  }
  const existingKeys = current.linkedContentKeys ?? [];
  if (existingKeys.includes(contentKey)) {
    return current;
  }
  return updateDesktopProject(storage, projectId, {
    linkedContentKeys: [...existingKeys, contentKey],
  });
}

export function useActiveProjectScope(options?: {
  projectScopeId?: string | null;
  isDesktop?: boolean;
}): DesktopFolderProject | null {
  const location = useLocation();
  const [activeProject, setActiveProject] = useState<DesktopFolderProject | null>(() => {
    return resolveActiveProjectScope({
      location,
      projectScopeId: options?.projectScopeId,
      isDesktop: options?.isDesktop,
    });
  });

  useEffect(() => {
    const update = () => {
      setActiveProject(
        resolveActiveProjectScope({
          location,
          projectScopeId: options?.projectScopeId,
          isDesktop: options?.isDesktop,
        }),
      );
    };
    update();
    if (typeof window !== "undefined") {
      window.addEventListener(DESKTOP_FOLDER_SELECTION_EVENT, update);
      window.addEventListener("storage", update);
      return () => {
        window.removeEventListener(DESKTOP_FOLDER_SELECTION_EVENT, update);
        window.removeEventListener("storage", update);
      };
    }
  }, [location.pathname, location.search, options?.projectScopeId, options?.isDesktop]);

  return activeProject;
}
