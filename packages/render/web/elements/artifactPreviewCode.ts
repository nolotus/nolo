export const ARTIFACT_MAX_MESSAGE_BYTES = 1_000_000;

export function acceptArtifactMessage(
  event: { source: unknown; data: unknown },
  options: {
    iframeWindow: unknown;
    allowedEvents?: Record<string, (payload: unknown) => boolean>;
    maxBytes?: number;
    onEvent?: (event: { type: string; payload: unknown }) => void;
  }
): boolean {
  if (event.source !== options.iframeWindow) return false;
  const message = event.data as Record<string, unknown> | null;
  if (!message || message.source !== "nolo-artifact-runtime") return false;
  let bytes: number;
  try {
    bytes = new TextEncoder().encode(JSON.stringify(message)).byteLength;
  } catch {
    return false;
  }
  if (bytes > (options.maxBytes ?? ARTIFACT_MAX_MESSAGE_BYTES)) return false;
  if (message.type !== "nolo-artifact-event") return true;
  if (typeof message.eventType !== "string") return false;
  const validator = options.allowedEvents?.[message.eventType];
  if (!validator || !validator(message.payload)) return false;
  options.onEvent?.({ type: message.eventType, payload: message.payload });
  return true;
}

export type ArtifactPreviewBuildResult = {
  code: string | null;
  error: string | null;
};

const BLOCKED_IMPORT_RE =
  /import\s+[^;]*\sfrom\s*['"](react|echarts-for-react|react-icons\/lu)['"];?/g;

function stripLightweightTypeScript(code: string): string {
  const stripParamList = (params: string) =>
    params.replace(
      /(^|,)(\s*[A-Za-z_$][\w$]*)\s*:\s*[^,)=]+/g,
      "$1$2"
    );

  return code
    .replace(
      /(function\s+[A-Za-z_$][\w$]*\s*)\(([^)]*)\)/g,
      (_match, prefix: string, params: string) =>
        `${prefix}(${stripParamList(params)})`
    )
    .replace(
      /(function\s+[A-Za-z_$][\w$]*\([^)]*\))\s*:\s*[A-Za-z_$][\w$<>,\s.[\]|&]*(?=\s*\{)/g,
      "$1"
    )
    .replace(
      /\(([^()\n]*)\)\s*=>/g,
      (_match, params: string) => `(${stripParamList(params)}) =>`
    )
    .replace(
      /(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*[^=;]+(?=\s*=)/g,
      "$1 $2"
    )
    .replace(/\b(useState|useMemo|useRef|useReducer)<[^>(]+>\s*\(/g, "$1(");
}

export function sanitizeArtifactCode(rawCode: string): string {
  return stripLightweightTypeScript(rawCode)
    .replace(BLOCKED_IMPORT_RE, "")
    .replace(/export\s+default\s+\w+;?/g, "")
    .replace(/export\s+(const|let|var|function|class)\s+/g, "$1 ")
    .trim();
}
