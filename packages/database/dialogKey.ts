import { DataType } from "create/types";
import { splitDialogKeyIdentity } from "core/dialogKeyIdentity";
import { ulid } from "./utils/ulid";

const SEPARATOR = "-";
const createKey = (...parts: (string | number)[]) => parts.join(SEPARATOR);
const splitKey = (key: string) => key.split(SEPARATOR);

export const buildDialogKey = (userId: string, dialogId: string): string =>
  createKey(DataType.DIALOG, userId, dialogId);

/**
 * `dialog-<userId>-<dialogId>` → 身份。
 * dialogId 形态（ULID / UUID）由 `core/dialogKeyIdentity` 统一判定：UUID 尾段
 * 也带 '-'，按「最后一段即 dialogId」切会把 id 截断，故不再在此重复切法。
 */
export const parseDialogKey = (
  key: string,
): { userId: string; dialogId: string } | null => {
  const prefix = `${DataType.DIALOG}${SEPARATOR}`;
  if (typeof key !== "string" || !key.startsWith(prefix)) return null;
  return splitDialogKeyIdentity(key);
};

export const isDialogKey = (key: string): boolean => {
  const parts = splitKey(key);
  return parts.length >= 3 && parts[0] === DataType.DIALOG;
};

export const isDialogRecordKey = (key: string): boolean => {
  if (typeof key !== "string" || !key.startsWith(`${DataType.DIALOG}-`)) return false;
  if (key.includes("-msg-")) return false;
  const parts = splitKey(key);
  return parts.length >= 3 && parts[0] === DataType.DIALOG;
};

export const isDialogRecordKeyForId = (key: string, dialogId: string): boolean => {
  if (!dialogId || !isDialogRecordKey(key)) return false;
  return key.endsWith(`${SEPARATOR}${dialogId}`);
};

export const createDialogKey = Object.assign(
  (userId: string) => createKey(DataType.DIALOG, userId, ulid()),
  {
    single: (userId: string, dialogId: string) =>
      createKey(DataType.DIALOG, userId, dialogId),
    rangeOfUser: (userId: string) => ({
      start: createKey(DataType.DIALOG, userId, ""),
      end: createKey(DataType.DIALOG, userId, "\uffff"),
    }),
  },
);

/** Arg is dialogId (not full dialogKey). */
export const dialogMessageKey = (dialogId: string, messageId: string): string =>
  createKey(DataType.DIALOG, dialogId, "msg", messageId);

export const createDialogMessageKeyAndId = (
  dialogId: string,
  ulidFn: () => string = ulid,
): { key: string; messageId: string } => {
  const messageId = ulidFn();
  return { key: dialogMessageKey(dialogId, messageId), messageId };
};

/** Arg is dialogId (not full dialogKey). */
export const dialogMessagePrefix = (dialogId: string): string =>
  createKey(DataType.DIALOG, dialogId, "msg");

export const dialogMessageRange = (dialogId: string) => ({
  start: createKey(DataType.DIALOG, dialogId, "msg", ""),
  end: createKey(DataType.DIALOG, dialogId, "msg", "\uffff"),
});

export type ParsedDialogMessageKey = {
  dialogId: string;
  messageId: string;
};

export function parseDialogMessageKey(key: string): ParsedDialogMessageKey | null {
  if (!key.startsWith("dialog-")) return null;
  const marker = "-msg-";
  const markerIndex = key.indexOf(marker);
  if (markerIndex < 0) return null;
  const dialogId = key.slice("dialog-".length, markerIndex);
  const messageId = key.slice(markerIndex + marker.length);
  if (!dialogId || !messageId) return null;
  return { dialogId, messageId };
}
