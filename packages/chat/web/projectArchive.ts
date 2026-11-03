import { createPageAction } from "render/page/createPageAction";
import { DESKTOP_FOLDER_PROJECTS_KEY, readDesktopFolderProjects, updateDesktopProject, type DesktopFolderProject } from "./desktopFolderProjects";

const pending = new Map<string, Promise<string>>();
/** One archive per project, created only when its first conversation starts. */
export function ensureProjectArchive(project: DesktopFolderProject, firstMessage: string, services: Parameters<typeof createPageAction>[1]): Promise<string> {
  const latest = readDesktopFolderProjects(window.localStorage.getItem(DESKTOP_FOLDER_PROJECTS_KEY)).find((p) => p.id === project.id);
  if (!latest) return Promise.reject(new Error("项目已不存在"));
  if (latest.archiveKey) return Promise.resolve(latest.archiveKey);
  const existing = pending.get(project.id);
  if (existing) return existing;
  const request = createPageAction({
    title: `${project.name} · 项目档案`,
    // Empty string explicitly prevents createPageAction falling back to another active Space.
    spaceId: project.spaceId || "",
    content: `# ${project.name}\n\n## 目标与目的\n根据首次需求逐步明确。\n\n${firstMessage}\n\n## 当前进展\n项目对话已开始，尚无已验收成果。\n\n## 阶段与下一步\n由项目主 Agent 与用户确认。\n\n## 参考内容\n${(project.linkedContentKeys ?? []).map((key) => `- ${key}`).join("\n") || "暂无"}\n`,
  }, services).then((key) => {
    updateDesktopProject(window.localStorage, project.id, { archiveKey: key });
    return key;
  }).finally(() => pending.delete(project.id));
  pending.set(project.id, request);
  return request;
}

