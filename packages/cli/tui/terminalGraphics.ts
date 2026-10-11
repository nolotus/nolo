/**
 * Kitty 图形协议底座（单块）：纯协议编码 / 解析 / 按实例资源状态。
 *
 * 边界（本文件刻意不做的事）：
 * - 不写 stdout、不读 stdin、不接任何现有渲染路径；输出只是转义序列字符串数组，
 *   由渲染层在自己的写入边界内发出（见 terminalWriteBoundary.source.test.ts）。
 * - 不下载任意 URL；图片只接受调用方给出的 PNG 字节。
 * - 模型文本永不进入控制序列：编码只嵌入数字参数与 base64，session 的 key
 *   只用于 Map 查找，不会被序列化进输出。
 *
 * 协议依据（kitty graphics protocol 官方文档）：
 * - 查询：a=q 带 i=<id>，随后发 DA1（ESC [ c）。收到带 i 的 APC 回复即支持；
 *   只收到 DA1 而无图形回复即不支持。
 * - 传输：f=100 为 PNG；远端分块每块 ≤4096 字节，除末块外长度须为 4 的倍数，
 *   首块带全部控制键，后续块只带 m（及可选 q）。
 * - 显示：a=T 传输并显示；c/r 为占用单元格数，只给一个时另一个按宽高比算，
 *   两者都给则 letterbox，不变形。C=1 不移动光标。
 * - 回复格式：ESC _ G i=<id>;OK|<错误> ESC \。q=2 抑制回复。
 * - 删除：a=d,d=I,i=<id> 删除该 id 的图片并释放数据（大写 I）。
 * - tmux/screen 默认不透传 APC，本模块在多路复用器内一律降级。
 */

export const KITTY_ST = "\x1b\\";
export const KITTY_CHUNK_CHARS = 4096;
export const KITTY_MAX_PNG_BYTES = 8 * 1024 * 1024;
export const KITTY_MAX_PIXELS = 4096 * 4096;
export const KITTY_MAX_ROWS = 8;
export const KITTY_MAX_COLUMNS = 500;
export const KITTY_PLACEMENT_ID = 1;
/** 单张图同时可见的放置数上限（一屏放不下这么多缩略图）。 */
export const KITTY_MAX_PLACEMENTS = 64;
export const KITTY_PROBE_ID = 31;

/** placement id 与 image id 同为 32 位无符号整数，0 与越界都不可用。 */
function isPlacementId(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 0xffffffff;
}

const DA1_QUERY = "\x1b[c";
const DA1_REPLY_RE = /\x1b\[\?[0-9;]*c/;
const APC_REPLY_RE = /\x1b_G([^;\x1b]*);([^\x1b]*)\x1b\\/g;
const MAX_REPLY_CHARS = 64 * 1024;
const MAX_MESSAGE_CHARS = 256;
const MAX_IMAGES_PER_SESSION = 64;
const MAX_NAMESPACE = 0xffff;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// ── 模式与探测计划 ────────────────────────────────────────────────────────

export type GraphicsMode = "auto" | "on" | "off";

/** 未知或缺省的值一律按 auto 处理，不让配置拼写错误变成硬失败。 */
export function resolveGraphicsMode(raw: string | undefined): GraphicsMode {
  const value = raw?.trim().toLowerCase();
  return value === "on" || value === "off" ? value : "auto";
}

export type GraphicsEnv = Readonly<Record<string, string | undefined>>;

export type GraphicsPlanReason =
  | "off"
  | "multiplexer"
  | "not-kitty-candidate"
  | "env-candidate"
  | "forced";

export interface GraphicsPlan {
  /** 为 true 时才应发送查询探测；探测成功前不得传输图片。 */
  readonly probe: boolean;
  readonly reason: GraphicsPlanReason;
}

function isMultiplexer(env: GraphicsEnv): boolean {
  const term = env.TERM ?? "";
  return Boolean(env.TMUX) || term.startsWith("tmux") || term.startsWith("screen");
}

function isKittyCandidate(env: GraphicsEnv): boolean {
  if (env.KITTY_WINDOW_ID) return true;
  if (env.TERM === "xterm-kitty" || env.TERM === "xterm-ghostty") return true;
  const program = env.TERM_PROGRAM?.toLowerCase();
  return program === "ghostty" || program === "wezterm";
}

/**
 * 多路复用器内永远降级（即使 mode=on）：默认不透传 APC，强行发送只会吐出乱码。
 * auto 只在环境像 kitty 协议终端时探测；on 跳过环境判断但仍须探测成功。
 */
export function planGraphics(mode: GraphicsMode, env: GraphicsEnv): GraphicsPlan {
  if (mode === "off") return { probe: false, reason: "off" };
  if (isMultiplexer(env)) return { probe: false, reason: "multiplexer" };
  if (mode === "on") return { probe: true, reason: "forced" };
  return isKittyCandidate(env)
    ? { probe: true, reason: "env-candidate" }
    : { probe: false, reason: "not-kitty-candidate" };
}

// ── 查询与回复解析 ────────────────────────────────────────────────────────

/** 1 像素 RGB 查询 + DA1。终端支持则先回图形回复，否则只回 DA1。 */
export function buildKittyProbe(): string {
  return `\x1b_Gi=${KITTY_PROBE_ID},s=1,v=1,a=q,t=d,f=24;AAAA${KITTY_ST}${DA1_QUERY}`;
}

export interface KittyReply {
  readonly id: number | undefined;
  readonly ok: boolean;
  /** 已净化：只保留可打印 ASCII，截断到 MAX_MESSAGE_CHARS。 */
  readonly message: string;
}

function parseControlId(control: string): number | undefined {
  for (const pair of control.split(",")) {
    const [key, value] = pair.split("=");
    if (key === "i" && value && /^\d+$/.test(value)) {
      const id = Number(value);
      return id > 0 && id <= 0xffffffff ? id : undefined;
    }
  }
  return undefined;
}

function sanitizeMessage(raw: string): string {
  return raw.replace(/[^\x20-\x7e]/g, "").slice(0, MAX_MESSAGE_CHARS);
}

export function parseKittyReplies(input: string): KittyReply[] {
  const text = input.length > MAX_REPLY_CHARS ? input.slice(0, MAX_REPLY_CHARS) : input;
  const replies: KittyReply[] = [];
  for (const match of text.matchAll(APC_REPLY_RE)) {
    const message = sanitizeMessage(match[2] ?? "");
    replies.push({ id: parseControlId(match[1] ?? ""), ok: message === "OK", message });
  }
  return replies;
}

export type GraphicsProbeResult = "supported" | "unsupported" | "pending";

/**
 * 只认带探测 id 的图形回复；仅有 DA1 而无图形回复即不支持。
 * 图形回复排在 DA1 前后都算支持（终端按 FIFO 回复，顺序不影响结论）。
 */
export function parseGraphicsProbeReply(input: string): GraphicsProbeResult {
  const text = input.length > MAX_REPLY_CHARS ? input.slice(0, MAX_REPLY_CHARS) : input;
  if (parseKittyReplies(text).some((reply) => reply.id === KITTY_PROBE_ID)) return "supported";
  if (DA1_REPLY_RE.test(text)) return "unsupported";
  return "pending";
}

// ── PNG 头与显示尺寸 ──────────────────────────────────────────────────────

export type PngSizeResult =
  | { readonly ok: true; readonly width: number; readonly height: number }
  | { readonly ok: false; readonly reason: "not-png" | "bad-size" | "too-many-pixels" };

/** 只读 PNG 签名与 IHDR，不解码像素。 */
export function readPngSize(png: Uint8Array): PngSizeResult {
  if (png.byteLength < 24 || PNG_SIGNATURE.some((byte, i) => png[i] !== byte)) {
    return { ok: false, reason: "not-png" };
  }
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const type = String.fromCharCode(...png.subarray(12, 16));
  if (view.getUint32(8) !== 13 || type !== "IHDR") return { ok: false, reason: "not-png" };
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width === 0 || height === 0) return { ok: false, reason: "bad-size" };
  if (width * height > KITTY_MAX_PIXELS) return { ok: false, reason: "too-many-pixels" };
  return { ok: true, width, height };
}

export interface CellMetrics {
  readonly widthPx: number;
  readonly heightPx: number;
}

/** 终端未报告单元格像素尺寸时的保守估计（常见等宽字体比例）。 */
export const DEFAULT_CELL_METRICS: CellMetrics = { widthPx: 10, heightPx: 20 };

export interface CellFit {
  readonly columns: number;
  readonly rows: number;
}

/**
 * 等比缩放到占用单元格：行数先取自然高度并封顶 KITTY_MAX_ROWS；
 * 超出列上限时以列为准反算行数。结果宽高比与源图近似一致，kitty 会 letterbox。
 */
export function fitImageToCells(
  size: { readonly width: number; readonly height: number },
  options: { readonly maxColumns: number; readonly cell?: CellMetrics },
): CellFit {
  const maxColumns = Math.max(1, Math.min(Math.floor(options.maxColumns), KITTY_MAX_COLUMNS));
  const cell = options.cell ?? DEFAULT_CELL_METRICS;
  const aspect = size.width / size.height;
  let rows = Math.min(KITTY_MAX_ROWS, Math.max(1, Math.ceil(size.height / cell.heightPx)));
  let columns = Math.max(1, Math.round((rows * cell.heightPx * aspect) / cell.widthPx));
  if (columns > maxColumns) {
    columns = maxColumns;
    rows = Math.max(1, Math.round((columns * cell.widthPx) / (aspect * cell.heightPx)));
  }
  return { columns, rows: Math.min(rows, KITTY_MAX_ROWS) };
}

// ── 传输编码 ─────────────────────────────────────────────────────────────

export type KittyEncodeError =
  | "too-large-bytes"
  | "not-png"
  | "bad-size"
  | "too-many-pixels"
  | "bad-image-id"
  | "bad-placement-id"
  | "bad-cells";

export interface KittyImageRequest {
  readonly png: Uint8Array;
  /** 来自 session.imageIdFor，稳定且只属于本实例。 */
  readonly imageId: number;
  /**
   * 本次传输要放置的 placement id。同一张图在屏幕上出现多次时必须各用一个
   * 不同 id：kitty 按 (i, p) 识别放置，同 (i, p) 的新放置是替换而不是新增。
   * 缺省 1，兼容单处放置。
   */
  readonly placementId?: number;
  readonly columns: number;
  readonly rows: number;
}

export type KittyEncodeResult =
  | { readonly ok: true; readonly sequences: string[] }
  | { readonly ok: false; readonly reason: KittyEncodeError };

/**
 * 把 PNG 编码成 a=T 传输并显示的序列（q=2 抑制回复，C=1 不移动光标）。
 * 返回值是可直接写入的字符串数组；调用方须把光标放到目标区域左上角。
 */
export function encodeKittyImage(request: KittyImageRequest): KittyEncodeResult {
  const { png, imageId, columns, rows } = request;
  const placementId = request.placementId ?? KITTY_PLACEMENT_ID;
  if (png.byteLength > KITTY_MAX_PNG_BYTES) return { ok: false, reason: "too-large-bytes" };
  const header = readPngSize(png);
  if (!header.ok) return { ok: false, reason: header.reason };
  if (!Number.isInteger(imageId) || imageId < 1 || imageId > 0xffffffff) {
    return { ok: false, reason: "bad-image-id" };
  }
  if (!isPlacementId(placementId)) return { ok: false, reason: "bad-placement-id" };
  if (
    !Number.isInteger(rows) || rows < 1 || rows > KITTY_MAX_ROWS ||
    !Number.isInteger(columns) || columns < 1 || columns > KITTY_MAX_COLUMNS
  ) {
    return { ok: false, reason: "bad-cells" };
  }

  const payload = Buffer.from(png.buffer, png.byteOffset, png.byteLength).toString("base64");
  const control = `a=T,f=100,i=${imageId},p=${placementId},c=${columns},r=${rows},C=1,q=2`;
  const sequences: string[] = [];
  for (let offset = 0; offset < payload.length || sequences.length === 0; offset += KITTY_CHUNK_CHARS) {
    const chunk = payload.slice(offset, offset + KITTY_CHUNK_CHARS);
    const more = offset + KITTY_CHUNK_CHARS < payload.length ? 1 : 0;
    const keys = sequences.length === 0 ? `${control},m=${more}` : `m=${more}`;
    sequences.push(`\x1b_G${keys};${chunk}${KITTY_ST}`);
  }
  return { ok: true, sequences };
}

export interface KittyPlacementRequest {
  readonly imageId: number;
  /** 缺省 1；同一张图的多处放置必须各用一个不同 id。 */
  readonly placementId?: number;
  readonly columns: number;
  readonly rows: number;
}

/**
 * 复用已传输图片的 placement（a=p）：同 i 与 p 的新 placement 会替换旧位置，
 * 不同 p 则是各自独立的放置；C=1 不移动光标。参数不合法返回 undefined。
 */
export function encodeKittyPlacement(request: KittyPlacementRequest): string | undefined {
  const { imageId, columns, rows } = request;
  const placementId = request.placementId ?? KITTY_PLACEMENT_ID;
  if (!Number.isInteger(imageId) || imageId < 1 || imageId > 0xffffffff) return undefined;
  if (!isPlacementId(placementId)) return undefined;
  if (
    !Number.isInteger(rows) || rows < 1 || rows > KITTY_MAX_ROWS ||
    !Number.isInteger(columns) || columns < 1 || columns > KITTY_MAX_COLUMNS
  ) {
    return undefined;
  }
  return `\x1b_Ga=p,i=${imageId},p=${placementId},c=${columns},r=${rows},C=1,q=2${KITTY_ST}`;
}

/** 只删除该图片的本 placement（小写 d=i），保留图片数据，之后可直接 a=p 复用。 */
export function encodeKittyDeletePlacement(imageId: number, placementId?: number): string {
  const id = placementId ?? KITTY_PLACEMENT_ID;
  return `\x1b_Ga=d,d=i,i=${imageId},p=${id},q=2${KITTY_ST}`;
}

// ── 按实例资源状态 ───────────────────────────────────────────────────────

export interface KittyGraphicsSession {
  /** 同一 key 永远得到同一 id；超过容量返回 undefined。 */
  imageIdFor(key: string): number | undefined;
  /** 只删除本实例分配过的 id，并清空记录；返回删除序列。 */
  release(): string[];
  readonly ownedIds: readonly number[];
}

/**
 * namespace（1..65535）把各实例的 id 隔开：id = namespace * 65536 + 序号。
 * 同进程多个实例互不覆盖，且 release 只会删到自己的 id。
 */
export function createKittyGraphicsSession(namespace: number): KittyGraphicsSession {
  if (!Number.isInteger(namespace) || namespace < 1 || namespace > MAX_NAMESPACE) {
    throw new RangeError(`kitty graphics namespace must be 1..${MAX_NAMESPACE}`);
  }
  const indexByKey = new Map<string, number>();
  const idOf = (index: number) => namespace * 65536 + index;

  return {
    imageIdFor(key) {
      const known = indexByKey.get(key);
      if (known !== undefined) return idOf(known);
      if (indexByKey.size >= MAX_IMAGES_PER_SESSION) return undefined;
      const index = indexByKey.size + 1;
      indexByKey.set(key, index);
      return idOf(index);
    },
    release() {
      const sequences = [...indexByKey.values()].map(
        (index) => `\x1b_Ga=d,d=I,i=${idOf(index)},q=2${KITTY_ST}`,
      );
      indexByKey.clear();
      return sequences;
    },
    get ownedIds() {
      return [...indexByKey.values()].map(idOf);
    },
  };
}
