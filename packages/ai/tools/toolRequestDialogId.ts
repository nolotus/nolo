import { isDialogRecordKey, parseDialogKey } from "database/dialogKey";

export interface ToolRequestDialogContext {
  dialogId?: string | null;
  dialogKey?: string | null;
}

/** Only execution context is attribution. Nullish identity fields mean no attribution;
 * supplied identities must resolve to a loaded record, never to active UI state. */
export function toolRequestDialogId(context: ToolRequestDialogContext | undefined, getState: () => unknown): string | undefined {
  const invalid = (reason: string): never => {
    throw new Error(`工具执行上下文身份无效：${reason}`);
  };
  const field = (value: unknown, name: string): string | undefined => {
    if (value == null) return undefined;
    if (typeof value !== "string" || !value.trim()) return invalid(`${name} 必须是非空字符串。`);
    return value.trim();
  };
  const id = field(context?.dialogId, "dialogId");
  const key = field(context?.dialogKey, "dialogKey");
  if (id === undefined && key === undefined) return undefined;

  const parsed = key === undefined ? undefined : parseDialogKey(key);
  if (key !== undefined && !parsed) return invalid("dialogKey 无法解析。");
  if (id !== undefined && parsed && id !== parsed.dialogId) {
    return invalid("dialogKey/dialogId 不一致。");
  }
  const dialogId = parsed?.dialogId ?? id!;
  let state: unknown;
  try {
    state = getState();
  } catch {
    return invalid("无法读取已加载的对话记录。");
  }
  const entities = (state as any)?.db?.entities;
  const matches = Object.entries(entities ?? {}).filter(([recordKey, record]) => {
    if (key !== undefined && recordKey !== key) return false;
    if (!isDialogRecordKey(recordKey)) return false;
    const identity = parseDialogKey(recordKey);
    return identity?.dialogId === dialogId && (record as any)?.id === dialogId;
  });
  if (matches.length === 0) return invalid("对话记录未加载或记录身份不一致。");
  if (matches.length !== 1) return invalid("同一 dialogId 存在跨 owner 歧义，请提供完整 dialogKey。");
  return dialogId;
}
