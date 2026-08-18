import { normalizeServerOrigin } from "core/serverOrigin";
import { BASE as DEFAULT_BASE } from "../testUtils";
import { DataType } from "../../packages/create/types";
import { parseDialogInput, type DialogInput } from "./dialogDataHelpers";

const DIALOG_KEY_RE = /^dialog-(.+)-([0-9A-HJKMNP-TV-Z]{26})$/i;
const PAGE_SEGMENT_RE = /^page-[^/]+$/i;

export type ShareTarget =
  | {
      type: DataType.DIALOG;
      base: string;
      dialogInput: DialogInput;
      dialogKey: string;
    }
  | {
      type: DataType.DOC;
      base: string;
      pageKey: string;
    };

function defaultBase() {
  return process.env.SHARE_RESOURCE_BASE ?? process.env.READ_DIALOG_BASE ?? DEFAULT_BASE;
}

function findPageKeyFromUrl(rawInput: string): { base: string; pageKey: string } | null {
  const url = new URL(rawInput);
  const pageSegment = url.pathname
    .split("/")
    .filter(Boolean)
    .find((part) => PAGE_SEGMENT_RE.test(part));
  if (!pageSegment) return null;
  return {
    base: process.env.SHARE_RESOURCE_BASE ?? url.origin,
    pageKey: pageSegment,
  };
}

export function parseShareTarget(
  rawInput: string,
  explicitType?: "dialog" | "page"
): ShareTarget {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error("share input is empty");
  }

  const pageFromUrl =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? findPageKeyFromUrl(trimmed)
      : false;
  if (explicitType === "page" || (!explicitType && (trimmed.startsWith("page-") || pageFromUrl))) {
    const pageKey = trimmed.startsWith("page-")
      ? trimmed
      : pageFromUrl
        ? pageFromUrl.pageKey
        : undefined;
    if (!pageKey) {
      throw new Error(`Unsupported page input: ${trimmed}`);
    }
    return {
      type: DataType.DOC,
      base: pageFromUrl ? pageFromUrl.base : defaultBase(),
      pageKey,
    };
  }

  if (trimmed.startsWith("dialog-")) {
    const match = trimmed.match(DIALOG_KEY_RE);
    if (!match) {
      throw new Error(`Unsupported dialog key: ${trimmed}`);
    }
    const [, userId, dialogId] = match;
    const dialogInput: DialogInput = {
      base: defaultBase(),
      dialogId,
      userId,
    };
    return {
      type: DataType.DIALOG,
      base: dialogInput.base,
      dialogInput,
      dialogKey: trimmed,
    };
  }

  const dialogInput = parseDialogInput(trimmed);
  return {
    type: DataType.DIALOG,
    base: dialogInput.base,
    dialogInput,
    dialogKey: `dialog-${dialogInput.userId}-${dialogInput.dialogId}`,
  };
}

export function sanitizeDialogMessages(messages: unknown[]) {
  return messages.map((message) => {
    if (!message || typeof message !== "object") return message;
    const { controller, ...rest } = message as Record<string, unknown> & {
      controller?: unknown;
    };
    return rest;
  });
}

export function buildWebShareUrl(baseUrl: string, token: string) {
  return `${normalizeServerOrigin(baseUrl)}/share/${token}`;
}
