/**
 * SSE 读取的共享读法。帧**内容**怎么解释仍归各 provider（见 sseDataLine.ts）。
 *
 * - `readSseFrames`（流式，按 `\n\n` 切帧）：openAiCompatible / platformChat。
 *   边收边 yield，调用方能逐帧回调 onTextDelta。
 * - `streamSseDataValues`（流式，按 `\n` 逐行解析并 yield）：codexResponses /
 *   antigravityCloudCode 等逐行 JSON 协议，上游每推一个 chunk 就能立即被消费。
 * - `readSseDataValues`（攒完再返回，按 `\n` 逐行解析）：基于 streamSseDataValues。
 */
export async function* readSseFrames(
  response: Response,
): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("SSE response did not include a readable body.");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = findSseFrameBoundary(buffer);
    while (boundary) {
      yield buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary.separatorLength);
      boundary = findSseFrameBoundary(buffer);
    }
  }
  const remaining = decoder.decode();
  if (remaining) {
    buffer += remaining;
    let boundary = findSseFrameBoundary(buffer);
    while (boundary) {
      yield buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary.separatorLength);
      boundary = findSseFrameBoundary(buffer);
    }
  }
  if (buffer.trim()) yield buffer;
}

/**
 * 找到一个完整 SSE 帧的边界起点（空行位置）。
 *
 * SSE 规范理论允许行终止符为 CRLF、LF 或 CR。实际主流 LLM 上游服务端只发送
 * `\n\n`（LF 换行）与 `\r\n\r\n`（CRLF 换行）两种形式。本项目传输层明确支持
 * 这两种边界模式（取最早出现者），避免 CRLF 帧被错误截断；不引入对独立 CR（`\r\r`）
 * 的非必要宽泛解析，使实现与实测支持子集严格一致。
 *
 * 返回边界起点 index 和该分隔符总长度，供调用方跳过；没有完整空行时返回 null。
 */
function findSseFrameBoundary(
  buffer: string,
): { index: number; separatorLength: number } | null {
  const lfLf = buffer.indexOf("\n\n");
  const crLfCrLf = buffer.indexOf("\r\n\r\n");
  if (lfLf === -1 && crLfCrLf === -1) return null;
  // `\r\n\r\n` 内部不会包含 `\n\n`（`\n` 后紧跟 `\r`），所以两种可以各自独立取最早。
  const useLf = lfLf !== -1 && (crLfCrLf === -1 || lfLf < crLfCrLf);
  return useLf
    ? { index: lfLf, separatorLength: 2 }
    : { index: crLfCrLf, separatorLength: 4 };
}

/**
 * 逐行解析 SSE `data:` 并以 AsyncGenerator 形式实时 yield `parse` 返回的非空值。
 */
export async function* streamSseDataValues<T>(
  response: Response,
  parse: (line: string) => T | null,
): AsyncGenerator<T> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const parsed = parse(line);
      if (parsed) yield parsed;
    }
  }
  const remaining = decoder.decode();
  if (remaining) {
    buffer += remaining;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const parsed = parse(line);
      if (parsed) yield parsed;
    }
  }
  if (buffer.trim()) {
    const parsed = parse(buffer);
    if (parsed) yield parsed;
  }
}

/**
 * 逐行解析 SSE `data:`，收集 `parse` 返回的非空值。
 */
export async function readSseDataValues<T>(
  response: Response,
  parse: (line: string) => T | null,
): Promise<T[]> {
  const values: T[] = [];
  for await (const value of streamSseDataValues(response, parse)) {
    values.push(value);
  }
  return values;
}
