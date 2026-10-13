// agent-runtime/devin/devinModelCatalog.ts
//
// Devin 通道的 live 模型目录（discover-models v2 的 runtime 底座）。
//
// 上游：ConnectRPC unary `exa.api_server_pb.ApiServerService/GetCliModelConfigs`
// （只读元数据，2026-10-13 实拉验证）。
//   - authorization: `Basic <token>-<token>`（不是 Bearer）
//   - content-type: `application/proto`（unary；`application/connect+proto` 会 415）
//   - connect-protocol-version: 1
//   - 请求 body = field1 的客户端 metadata 子消息（复用 encodeDevinClientMetadata）；
//     空 body 上游回 400 `invalid_argument`。
//
// 响应布局（2026-10-13 对 127KB 真实响应夹具逐字段走 wire 推定，259 个 entry
// 全部满足下述字段，无缺失、无重复 id）：
//   GetCliModelConfigsResponse
//     #1 repeated ClientModelConfig   （len-delimited，259 条）
//     #3 / #4 其他元数据（默认 selector、"subagent-default"），本模块忽略
//   ClientModelConfig
//     #1  string   展示名（label），如 "SWE-2 High"
//     #22 string   selector / 模型 id，如 "swe-2-high"（即 GetChatMessage 可用的 id）
//     #18 varint   context window（token），如 262000；与 devinChannelWindows.ts
//                  的实证（250K 过 / 275K 拒）一致，故视为可靠；缺失或非正则省略
//     其余字段（#3 fixed32、#5/#10/#11/#13/#24/#31 varint、#19/#23/#30/#32 子消息）
//     本模块不解释，按 wire type 跳过。
//
// 注：字段号来自对一份账号响应的推定，不是官方 .proto；账号/版本不同时 entry 数
// 会变（本机实测 259，旧注释为 213），字段号若漂移，解析结果会变空或缺 id，
// 由调用方（fetchDevinModelCatalog 的使用者）判定。

import { encodeDevinClientMetadata, writeMessageField } from "./devinProvider";

export type DevinCatalogModel = { id: string; label: string; contextWindow?: number };

export const DEVIN_CATALOG_URL =
  "https://server.codeium.com/exa.api_server_pb.ApiServerService/GetCliModelConfigs";

const DEFAULT_TIMEOUT_MS = 15_000;
const ENTRY_FIELD = 1;
const FIELD_LABEL = 1;
const FIELD_CONTEXT_WINDOW = 18;
const FIELD_ID = 22;

export function buildGetCliModelConfigsRequest(token: string): Buffer {
  return writeMessageField(1, encodeDevinClientMetadata(token));
}

type WireField =
  | { field: number; wire: 0; value: number }
  | { field: number; wire: 2; data: Uint8Array }
  | { field: number; wire: 1 | 5 };

/** 读 varint；截断/超长（>10 字节）返回 null。 */
function readVarint(bytes: Uint8Array, start: number): { value: number; next: number } | null {
  let value = 0;
  let multiplier = 1;
  let pos = start;
  for (let i = 0; i < 10; i++) {
    if (pos >= bytes.length) return null;
    const byte = bytes[pos++];
    value += (byte & 0x7f) * multiplier;
    if (!(byte & 0x80)) return { value, next: pos };
    multiplier *= 128;
  }
  return null;
}

/**
 * 按 wire 顺序迭代一层消息的字段。遇到截断/非法 wire type 就停止（已解出的
 * 字段仍会产出），绝不抛异常。
 */
function* iterateFields(bytes: Uint8Array): Generator<WireField> {
  let pos = 0;
  while (pos < bytes.length) {
    const tag = readVarint(bytes, pos);
    if (!tag) return;
    pos = tag.next;
    const field = Math.floor(tag.value / 8);
    const wire = tag.value % 8;
    if (field === 0) return;
    if (wire === 0) {
      const v = readVarint(bytes, pos);
      if (!v) return;
      pos = v.next;
      yield { field, wire: 0, value: v.value };
    } else if (wire === 2) {
      const len = readVarint(bytes, pos);
      if (!len) return;
      pos = len.next;
      if (len.value > bytes.length - pos) return;
      yield { field, wire: 2, data: bytes.subarray(pos, pos + len.value) };
      pos += len.value;
    } else if (wire === 1 || wire === 5) {
      const size = wire === 1 ? 8 : 4;
      if (pos + size > bytes.length) return;
      pos += size;
      yield { field, wire };
    } else {
      return; // group / 未知 wire type：无法继续对齐
    }
  }
}

const textDecoder = new TextDecoder("utf-8");

function parseModelConfig(bytes: Uint8Array): DevinCatalogModel | null {
  let id = "";
  let label = "";
  let contextWindow: number | undefined;
  for (const f of iterateFields(bytes)) {
    if (f.wire === 2 && f.field === FIELD_ID) id = textDecoder.decode(f.data).trim();
    else if (f.wire === 2 && f.field === FIELD_LABEL) label = textDecoder.decode(f.data).trim();
    else if (f.wire === 0 && f.field === FIELD_CONTEXT_WINDOW) {
      if (Number.isSafeInteger(f.value) && f.value > 0) contextWindow = f.value;
    }
  }
  if (!id) return null;
  const model: DevinCatalogModel = { id, label: label || id };
  if (contextWindow !== undefined) model.contextWindow = contextWindow;
  return model;
}

/**
 * 解析 GetCliModelConfigsResponse（裸 protobuf，非 connect 帧）。
 * 永不抛异常：空/损坏字节返回已能解出的 entry（可能为空数组）；缺 id 的 entry
 * 被丢弃；重复 id 保留首个。
 */
export function parseCliModelConfigsResponse(bytes: Uint8Array): DevinCatalogModel[] {
  const models: DevinCatalogModel[] = [];
  const seen = new Set<string>();
  try {
    for (const f of iterateFields(bytes)) {
      if (f.wire !== 2 || f.field !== ENTRY_FIELD) continue;
      const model = parseModelConfig(f.data);
      if (!model || seen.has(model.id)) continue;
      seen.add(model.id);
      models.push(model);
    }
  } catch {
    // 防御性兜底（如异常入参类型）；已解出的 entry 照常返回。
  }
  return models;
}

export async function fetchDevinModelCatalog(options: {
  token: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<DevinCatalogModel[]> {
  const { token, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = options;
  if (!token) throw new Error("devin model catalog: missing token");

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const response = await fetchImpl(DEVIN_CATALOG_URL, {
      method: "POST",
      headers: {
        authorization: `Basic ${token}-${token}`,
        "content-type": "application/proto",
        "connect-protocol-version": "1",
      },
      body: new Uint8Array(buildGetCliModelConfigsRequest(token)),
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) {
      // 只带状态码与截断后的上游错误文本；不回显 token。
      const detail = (await response.text().catch(() => "")).slice(0, 200);
      throw new Error(
        `devin model catalog: upstream ${response.status}${detail ? ` ${detail.split(token).join("***")}` : ""}`,
      );
    }
    return parseCliModelConfigsResponse(new Uint8Array(await response.arrayBuffer()));
  } catch (error) {
    if (timedOut) throw new Error(`devin model catalog: timed out after ${timeoutMs}ms`);
    if (signal?.aborted) throw new Error("devin model catalog: aborted");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}
