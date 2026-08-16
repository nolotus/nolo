export const DEFAULT_CUSTOM_CODING_TOOLS = [
  "read",
  "searchDialogMessages",
  "searchFiles",
  "codeSearch",
  "execShell",
  "checkEnv",
  "rememberMemory",
  "readFile",
  "writeFile",
  "editFile",
  "createDoc",
  "updateDoc",
  "createTable",
  "addTableRow",
  "queryTableRows",
  "updateContentTitle",
  "fetchWebpage",
];

export function resolveTargetSpaceId(explicit?: string) {
  const value = explicit?.trim();
  return value || undefined;
}
