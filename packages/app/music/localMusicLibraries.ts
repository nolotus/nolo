import { readDesktopFolderProjects, DESKTOP_FOLDER_PROJECTS_KEY, readSelectedDesktopFolderProject } from "chat/web/desktopFolderProjects";

export interface MusicLibrary { id: string; name: string; localPath: string }
export const MUSIC_LIBRARIES_KEY = "nolo:music-libraries:v1";
export const MUSIC_LIBRARY_SELECTION_KEY = "nolo:music-library-selection:v1";
export const MUSIC_LIBRARIES_EVENT = "nolo:music-libraries-changed";
type Reader = Pick<Storage, "getItem">;
type Writer = Reader & Pick<Storage, "setItem">;

function readOwnLibraries(storage: Reader): MusicLibrary[] {
  const raw = storage.getItem(MUSIC_LIBRARIES_KEY);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.some(item => !item || typeof item.id !== "string" || !/^music_[A-Za-z0-9_-]+$/.test(item.id) || typeof item.name !== "string" || typeof item.localPath !== "string")) {
    throw new Error("音乐库记录无法读取，未覆盖原数据");
  }
  return value;
}
export function readMusicLibraries(storage: Reader): MusicLibrary[] {
  const legacy = readDesktopFolderProjects(storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY));
  const own = readOwnLibraries(storage);
  return [...legacy, ...own.filter(item => !legacy.some(old => old.id === item.id))];
}
export function readSelectedMusicLibrary(storage: Reader): MusicLibrary | null {
  const libraries = readMusicLibraries(storage);
  const selected = storage.getItem(MUSIC_LIBRARY_SELECTION_KEY);
  // Compatibility read only: never rewrite or migrate the retired Project selection.
  const id = selected ?? readSelectedDesktopFolderProject(storage)?.id;
  return libraries.find(item => item.id === id) ?? null;
}
function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new window.Event(MUSIC_LIBRARIES_EVENT));
}
export function selectMusicLibrary(storage: Writer, id: string): void {
  if (!readMusicLibraries(storage).some(item => item.id === id)) throw new Error("音乐库不存在");
  storage.setItem(MUSIC_LIBRARY_SELECTION_KEY, id);
  notify();
}
export function createMusicLibrary(storage: Writer, path: string): MusicLibrary {
  if (!/^(\/|[A-Za-z]:[\\/]|\\\\[^\\]+\\)/.test(path.trim())) throw new Error("请选择绝对路径的音乐目录");
  const own = readOwnLibraries(storage);
  const library = { id: `music_${crypto.randomUUID()}`, name: path.trim().split(/[\\/]/).filter(Boolean).at(-1) || "音乐库", localPath: path.trim() };
  storage.setItem(MUSIC_LIBRARIES_KEY, JSON.stringify([...own, library]));
  selectMusicLibrary(storage, library.id);
  return library;
}
