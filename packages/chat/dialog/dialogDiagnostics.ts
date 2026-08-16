import { getIsDesktopApp } from "app/utils/env";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedNonEmptyStringArray } from "core/stringArray";

export type DialogDiagnosticsRuntime = "desktop" | "web";

export type DialogDiagnosticsRoute = {
  origin?: string;
  pathname?: string;
  search?: string;
};

export type DialogDiagnosticsSource = {
  dialog?: Record<string, unknown> | null;
  dialogKey?: string | null;
  pageKey?: string | null;
  currentServer?: string | null;
  currentSpaceId?: string | null;
  route?: DialogDiagnosticsRoute | null;
  generatedAt?: string;
  runtime?: DialogDiagnosticsRuntime;
};

type DialogDiagnosticsPayload = {
  generatedAt: string;
  runtime: DialogDiagnosticsRuntime;
  serverOrigin?: string;
  route?: DialogDiagnosticsRoute;
  dialogKey?: string;
  pageKey?: string;
  dialogId?: string;
  spaceId?: string;
  agentKeys?: string[];
  status?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  compressionCount?: number;
};

const SENSITIVE_QUERY_KEY =
  /(?:token|auth|key|secret|password|passwd|pwd|cookie|session|code|credential)/i;

const asStringOrNumber = (value: unknown): string | number | undefined =>
  typeof value === "string" || typeof value === "number" ? value : undefined;

const getDialogField = (
  dialog: Record<string, unknown> | null | undefined,
  ...keys: string[]
): unknown => {
  if (!dialog) return undefined;
  for (const key of keys) {
    const value = dialog[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

export const sanitizeSearchParams = (
  search: string | undefined,
): string | undefined => {
  if (!search) return undefined;

  const normalized = search.startsWith("?") ? search.slice(1) : search;
  if (!normalized) return undefined;

  const params = new URLSearchParams(normalized);
  for (const key of Array.from(params.keys())) {
    if (SENSITIVE_QUERY_KEY.test(key)) {
      params.set(key, "[REDACTED]");
    }
  }

  const output = params.toString();
  return output ? `?${output}` : undefined;
};

export const buildCurrentRouteDiagnostics = ():
  | DialogDiagnosticsRoute
  | undefined => {
  if (typeof window === "undefined") return undefined;

  return {
    origin: window.location.origin,
    pathname: window.location.pathname,
    search: sanitizeSearchParams(window.location.search),
  };
};

export const buildDialogDiagnosticsPayload = (
  source: DialogDiagnosticsSource,
): DialogDiagnosticsPayload => {
  const dialog = source.dialog ?? undefined;
  const dialogKey =
    asOptionalTrimmedString(source.dialogKey) ||
    asOptionalTrimmedString(getDialogField(dialog, "dbKey", "key", "dialogKey"));
  const pageKey =
    asOptionalTrimmedString(source.pageKey) ||
    asOptionalTrimmedString(
      getDialogField(dialog, "pageKey", "dbKey", "key", "dialogKey"),
    );
  const spaceId =
    asOptionalTrimmedString(source.currentSpaceId) ||
    asOptionalTrimmedString(getDialogField(dialog, "spaceId", "space"));
  const rawAgents = getDialogField(dialog, "cybots", "agentKeys", "agents");
  const agentKeys = Array.isArray(rawAgents)
    ? asTrimmedNonEmptyStringArray(rawAgents)
    : undefined;

  return {
    generatedAt: source.generatedAt || new Date().toISOString(),
    runtime: source.runtime || (getIsDesktopApp() ? "desktop" : "web"),
    serverOrigin: asOptionalTrimmedString(source.currentServer),
    route: {
      origin: asOptionalTrimmedString(source.route?.origin),
      pathname: asOptionalTrimmedString(source.route?.pathname),
      search: sanitizeSearchParams(source.route?.search),
    },
    dialogKey,
    pageKey,
    dialogId: asOptionalTrimmedString(getDialogField(dialog, "id", "dialogId")),
    spaceId,
    agentKeys: agentKeys?.length ? agentKeys : undefined,
    status: asOptionalTrimmedString(getDialogField(dialog, "status")),
    createdAt: asStringOrNumber(getDialogField(dialog, "createdAt")),
    updatedAt: asStringOrNumber(getDialogField(dialog, "updatedAt")),
    compressionCount:
      typeof dialog?.compressionCount === "number"
        ? dialog.compressionCount
        : undefined,
  };
};

export const buildDialogDiagnosticsText = (
  source: DialogDiagnosticsSource,
): string => {
  const payload = buildDialogDiagnosticsPayload(source);
  return ["=== NOLO DIALOG DIAGNOSTICS ===", JSON.stringify(payload, null, 2)].join(
    "\n",
  );
};
