import { readSseFrames } from "../../agent-runtime/sseFrames";
import { parseSseDataLineObject } from "../../agent-runtime/sseDataLine";
import { projectChatUsage } from "./responsesJsonToChatCompletions";
import {
  toResponsesStreamFailure,
  extractOutputTextFromItem,
} from "../../agent-runtime/responsesSseStream";
import {
  extractReasoningFromResponseOutput,
} from "./responsesHelpers";
import {
  normalizeResponsesToolArguments,
  parsesAsJsonObject,
} from "../../agent-runtime/responsesToolCallAccumulator";

type Obj = Record<string, any>;

export type ResponsesStreamToChatOptions = {
  /**
   * 是否严格要求 response.completed 中的 status 为 "completed"。
   * 与 chatProxyBilling.ts:581-595 的 requireResponsesCompleted 语义对齐：
   * 仅在显式开启时拒绝非 "completed" 的终局状态（如 cancelled / in_progress 等）；
   * 注意：envelope status 为 failed / incomplete 在任何模式下均无条件判定为失败，
   * 与计费侧 chatProxyBilling.ts:542-562 保持严格一致。
   */
  requireResponsesCompleted?: boolean;
};

/** 参数片段：全局单调 seq，保证乱序到达的参数也能按真实到达顺序拼接。 */
type ArgFragment = { seq: number; text: string };

type ToolState = {
  ordinal: number;
  callId: string;
  itemId: string;
  name: string;
  /** 已收到的参数增量片段（按 seq 排序）。 */
  fragments: ArgFragment[];
  /** 已收到的完整参数快照（若有）。 */
  snapshot?: string;
  argumentsSent: string;
  sawDelta: boolean;
  headerEmitted: boolean;
  /**
   * 当收到与已下发参数冲突的非前缀快照时置位。
   * 下游已经消费了前缀，不可撤回；一旦发生非前缀覆盖，后续绝不能以 finish_reason: "tool_calls" 成功收尾。
   */
  corruptedSnapshot?: {
    sent: string;
    snapshot: string;
  };
};

/**
 * 待定桶：身份（call_id / name）尚未到达的工具参数暂存处。
 * 桶内绝不分配 ordinal、绝不下发帧；身份到达后由 applyIdentity 合并进同一个工具状态。
 */
type PendingToolBucket = {
  keys: Set<string>;
  fragments: ArgFragment[];
  snapshot?: string;
  sawDelta: boolean;
  name: string;
  callId: string;
  itemId: string;
  /** 该桶由上游的 function_call item 事件引入（上游确实发起了这个工具调用）。 */
  announced: boolean;
};

/**
 * 纯流式协议适配器：OpenAI/DeepSeek Responses SSE 流 → chat.completions chunk SSE 流。
 *
 * 为什么需要：
 * 当上游走 Responses wire（upstreamWire === "responses"），而客户端声明 chat wire
 * （如网页端只认 choices[0].delta / chat.completion.chunk）时，上游原生的 Responses SSE
 * 无法被客户端解析。本适配器在服务端计费观察点之后转译下游 wire，使网页端无缝消费。
 *
 * 生命周期与背压：
 * - 纯流式 pull 驱动，highWaterMark: 0 避免激进预读；
 * - 客户端 cancel 必须穿透到上游 reader，避免中断后上游流悬挂与资源泄漏；
 * - 必须收到 response.completed 终局事件才发收尾帧与 [DONE]；clean EOF 或 response.failed
 *   显式下发可诊断错误帧，绝不伪装成 finish_reason:"stop" 的成功。
 * - 服务端注入的 {billing: ...} 帧原样透传；收到 response.completed 后不立即 return，
 *   而是缓住收尾帧继续读到上游 [DONE]/EOF 转发 billing 帧，最后才发收尾帧与 [DONE]。
 */
export function responsesStreamToChatCompletionsStream(
  stream: ReadableStream<Uint8Array>,
  options?: ResponsesStreamToChatOptions,
): ReadableStream<Uint8Array> {
  const reader = stream.getReader();
  let cancelled = false;
  const source = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const next = await reader.read();
          if (next.done) controller.close();
          else controller.enqueue(next.value);
        } catch (error) {
          controller.error(error);
        }
      },
      cancel: (reason) => reader.cancel(reason),
    },
    { highWaterMark: 0 },
  );
  const encoder = new TextEncoder();

  async function* project(): AsyncGenerator<Obj> {
    let id = "chatcmpl-responses";
    let model = "";
    let created = Math.floor(Date.now() / 1000);
    let sentRoleDelta = false;
    let sawTerminal = false;

    // 按 message item 跟踪已下发字符数，避免多 message 场景下后到 message 丢失
    const itemSentLengths = new Map<string, number>();
    let totalContentSentLength = 0;
    let reasoningSent = "";

    let toolCount = 0;
    const toolList: ToolState[] = [];
    const aliasToTool = new Map<string, ToolState>();
    // 身份未定的工具参数暂存桶：不分配 ordinal、不下发任何 tool_calls 帧
    const pendingBuckets: PendingToolBucket[] = [];
    let argSeq = 0;

    let pendingTerminalChunk: Obj | null = null;
    let terminalErrorChunk: Obj | null = null;

    const makeChunk = (
      delta: Record<string, unknown>,
      finishReason: string | null = null,
      extra?: Record<string, unknown>,
    ): Obj => ({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [
        {
          index: 0,
          delta,
          finish_reason: finishReason,
        },
      ],
      ...extra,
    });

    const makeErrorChunk = (err: { message: string; code: string; type?: string }): Obj => ({
      error: {
        message: err.message,
        code: err.code,
        type: err.type ?? "responses_stream_error",
      },
    });

    function collectKeys(event: Record<string, any>): string[] {
      const keys: string[] = [];
      const item = event.item as Record<string, any> | undefined;
      if (typeof item?.call_id === "string" && item.call_id) keys.push(item.call_id);
      if (typeof item?.id === "string" && item.id) keys.push(item.id);
      if (typeof event.call_id === "string" && event.call_id) keys.push(event.call_id);
      if (typeof event.item_id === "string" && event.item_id) keys.push(event.item_id);
      if (typeof event.output_index === "number") keys.push(`idx_${event.output_index}`);
      return keys;
    }

    /**
     * 工具状态（已确定身份、可下发）。
     * ordinal 只在身份确定时分配一次；headerEmitted 为真才说明头帧已下发。
     */
    function lookupTool(keys: string[]): ToolState | undefined {
      for (const k of keys) {
        const found = aliasToTool.get(k);
        if (found) return found;
      }
      return undefined;
    }

    function createToolState(): ToolState {
      const tool: ToolState = {
        ordinal: toolCount++,
        callId: "",
        itemId: "",
        name: "",
        fragments: [],
        snapshot: undefined,
        argumentsSent: "",
        sawDelta: false,
        headerEmitted: false,
      };
      toolList.push(tool);
      return tool;
    }

    /** 合并两个工具状态：保留较小 ordinal、合并身份与参数、重定向所有别名。 */
    function mergeToolStates(primary: ToolState, other: ToolState): void {
      if (!primary.callId && other.callId) primary.callId = other.callId;
      if (!primary.itemId && other.itemId) primary.itemId = other.itemId;
      if (!primary.name && other.name) primary.name = other.name;
      primary.headerEmitted = primary.headerEmitted || other.headerEmitted;
      primary.sawDelta = primary.sawDelta || other.sawDelta;
      if (other.corruptedSnapshot) primary.corruptedSnapshot = other.corruptedSnapshot;
      primary.fragments.push(...other.fragments);
      primary.fragments.sort((a, b) => a.seq - b.seq);
      if (other.snapshot !== undefined) applyToolSnapshot(primary, other.snapshot);
      if (other.argumentsSent.length > primary.argumentsSent.length) {
        primary.argumentsSent = other.argumentsSent;
      }
      const idx = toolList.indexOf(other);
      if (idx !== -1) toolList.splice(idx, 1);
      for (const [k, v] of aliasToTool.entries()) {
        if (v === other) aliasToTool.set(k, primary);
      }
    }

    /** 参数片段按到达顺序拼接（seq 全局单调递增，乱序到达也能还原真实顺序）。 */
    function combinedArgs(fragments: ArgFragment[], snapshot: string | undefined): string {
      const frag = fragments.map((f) => f.text).join("");
      if (snapshot === undefined) return frag;
      if (frag.length > snapshot.length && frag.startsWith(snapshot)) return frag;
      return snapshot;
    }

    /**
     * 快照合并语义（与 responsesToolCallAccumulator 对齐）：
     * 快照是累积值的超集 → 采信快照；快照是累积值的前缀 → 保留累积值；
     * 冲突时只有「累积值不可解析而快照可解析」才采信快照。
     */
    function applySnapshot(
      container: { fragments: ArgFragment[]; snapshot?: string; sawDelta: boolean },
      next: string,
    ): void {
      const current = combinedArgs(container.fragments, container.snapshot);
      if (!container.sawDelta) {
        container.snapshot = next;
        return;
      }
      if (next.startsWith(current)) {
        container.snapshot = next;
        return;
      }
      if (current.startsWith(next)) return;
      if (!parsesAsJsonObject(current) && parsesAsJsonObject(next)) {
        container.snapshot = next;
      }
    }

    function applyToolSnapshot(tool: ToolState, snapshot: string): void {
      const before = combinedArgs(tool.fragments, tool.snapshot);
      applySnapshot(tool, snapshot);
      const after = combinedArgs(tool.fragments, tool.snapshot);
      if (after === before) return;
      // 下游已消费的参数是不可撤回的前缀：快照覆盖后不再是该前缀的延续 → 显式失败
      if (tool.argumentsSent && !after.startsWith(tool.argumentsSent)) {
        tool.corruptedSnapshot = { sent: tool.argumentsSent, snapshot: after };
      }
    }

    /**
     * 下发工具帧。
     * 硬规则：身份（call_id 或 name）未确定前，绝不下发任何 tool_calls 帧——
     * 下游累加器遇到「非空且未见过的 id」或「无 id/name 的帧」会新建匿名 slot，
     * 具名 slot 将永远拿不到参数。
     */
    function* flushTool(tool: ToolState): Generator<Obj> {
      if (!tool.headerEmitted) {
        if (!tool.name || !(tool.callId || tool.itemId)) return;
        tool.headerEmitted = true;
        const args = combinedArgs(tool.fragments, tool.snapshot);
        let initialArgs = "";
        if (args.startsWith(tool.argumentsSent)) {
          initialArgs = args.slice(tool.argumentsSent.length);
          tool.argumentsSent = args;
        }
        yield makeChunk({
          tool_calls: [
            {
              index: tool.ordinal,
              id: tool.callId || tool.itemId,
              type: "function",
              function: {
                name: tool.name,
                arguments: initialArgs,
              },
            },
          ],
        });
        return;
      }

      const args = combinedArgs(tool.fragments, tool.snapshot);
      if (!args.startsWith(tool.argumentsSent)) return;
      const diff = args.slice(tool.argumentsSent.length);
      if (diff.length === 0) return;
      tool.argumentsSent = args;
      yield makeChunk({
        tool_calls: [
          {
            index: tool.ordinal,
            function: { arguments: diff },
          },
        ],
      });
    }

    function findBucket(keys: string[]): PendingToolBucket | undefined {
      for (const bucket of pendingBuckets) {
        for (const k of keys) {
          if (bucket.keys.has(k)) return bucket;
        }
      }
      return undefined;
    }

    function createBucket(keys: string[]): PendingToolBucket {
      const bucket: PendingToolBucket = {
        keys: new Set<string>(),
        fragments: [],
        snapshot: undefined,
        sawDelta: false,
        name: "",
        callId: "",
        itemId: "",
        announced: false,
      };
      for (const k of keys) bucket.keys.add(k);
      pendingBuckets.push(bucket);
      return bucket;
    }

    /** 合并命中的多个待定桶：参数片段按到达顺序拼接，身份取先到者。 */
    function mergeBuckets(buckets: PendingToolBucket[]): PendingToolBucket | undefined {
      if (buckets.length === 0) return undefined;
      const primary = buckets[0];
      for (const other of buckets.slice(1)) {
        for (const k of other.keys) primary.keys.add(k);
        primary.fragments.push(...other.fragments);
        primary.fragments.sort((a, b) => a.seq - b.seq);
        primary.sawDelta = primary.sawDelta || other.sawDelta;
        if (other.snapshot !== undefined) {
          if (primary.snapshot === undefined) primary.snapshot = other.snapshot;
          else applySnapshot(primary, other.snapshot);
        }
        if (!primary.name && other.name) primary.name = other.name;
        if (!primary.callId && other.callId) primary.callId = other.callId;
        if (!primary.itemId && other.itemId) primary.itemId = other.itemId;
        const idx = pendingBuckets.indexOf(other);
        if (idx !== -1) pendingBuckets.splice(idx, 1);
      }
      return primary;
    }

    /**
     * 身份事件（output_item.added / output_item.done / completed.output 快照）到达：
     * 1. 用任一键（call_id / item.id / item_id / output_index）匹配待定桶；
     * 2. 命中则复用同一 ordinal，并把已累积的完整 arguments 一次性写进头帧；
     * 3. 身份仍不完整则继续留在待定桶，不分配 ordinal、不下发帧；
     * 4. 映射未命中不新建匿名工具：新建工具必须有完整身份。
     */
    function* applyIdentity(
      keys: string[],
      identity: { callId: string; itemId: string; name: string },
      snapshot: string | undefined,
    ): Generator<Obj> {
      const matchedTools = new Set<ToolState>();
      for (const k of keys) {
        const found = aliasToTool.get(k);
        if (found) matchedTools.add(found);
      }
      const matchedBuckets = pendingBuckets.filter((bucket) =>
        keys.some((k) => bucket.keys.has(k)),
      );
      const bucket = mergeBuckets(matchedBuckets);

      const sorted = [...matchedTools].sort((a, b) => a.ordinal - b.ordinal);
      let primary = sorted[0];
      if (primary) {
        for (const other of sorted.slice(1)) mergeToolStates(primary, other);
      }

      const candName = identity.name || bucket?.name || "";
      const candCallId = identity.callId || bucket?.callId || "";
      const candItemId = identity.itemId || bucket?.itemId || "";
      const identityReady = candName !== "" && (candCallId !== "" || candItemId !== "");

      if (!primary) {
        if (!identityReady) {
          // 身份尚不完整：留在待定桶等待后续身份事件，绝不分配 ordinal、绝不下发帧
          const target = bucket ?? createBucket(keys);
          target.announced = true;
          if (candName) target.name = candName;
          if (candCallId) target.callId = candCallId;
          if (candItemId) target.itemId = candItemId;
          if (snapshot !== undefined) applySnapshot(target, snapshot);
          return;
        }
        primary = createToolState();
      }

      if (!primary.callId && candCallId) primary.callId = candCallId;
      if (!primary.itemId && candItemId) primary.itemId = candItemId;
      if (!primary.name && candName) primary.name = candName;

      if (bucket) {
        if (bucket.sawDelta) primary.sawDelta = true;
        primary.fragments.push(...bucket.fragments);
        primary.fragments.sort((a, b) => a.seq - b.seq);
        if (bucket.snapshot !== undefined) applyToolSnapshot(primary, bucket.snapshot);
        for (const k of bucket.keys) aliasToTool.set(k, primary);
        // 桶已被工具吸收：不再算作「身份未定」
        const bucketIdx = pendingBuckets.indexOf(bucket);
        if (bucketIdx !== -1) pendingBuckets.splice(bucketIdx, 1);
      }
      if (snapshot !== undefined) applyToolSnapshot(primary, snapshot);

      for (const k of keys) aliasToTool.set(k, primary);

      yield* flushTool(primary);
    }

    /**
     * 参数事件（arguments.delta / arguments.done）：
     * 身份未确定 → 只进待定桶，不分配 ordinal、不下发帧；
     * 身份已确定 → 落到对应工具并按增量下发。
     */
    function* handleArgumentsEvent(
      event: Record<string, any>,
      isDone: boolean,
    ): Generator<Obj> {
      const keys = collectKeys(event);
      const delta = typeof event.delta === "string" ? event.delta : "";
      const snapshot = isDone ? normalizeResponsesToolArguments(event.arguments) : undefined;

      const tool = lookupTool(keys);
      if (tool) {
        if (!isDone && delta) {
          tool.sawDelta = true;
          tool.fragments.push({ seq: argSeq++, text: delta });
        }
        if (snapshot !== undefined) applyToolSnapshot(tool, snapshot);
        yield* flushTool(tool);
        return;
      }

      // 没有任何可挂靠的键 → 无法归属任何工具，直接丢弃（既不下发帧也不记错）
      if (keys.length === 0) return;

      const bucket = findBucket(keys) ?? createBucket(keys);
      for (const k of keys) bucket.keys.add(k);
      if (!isDone && delta) {
        bucket.sawDelta = true;
        bucket.fragments.push({ seq: argSeq++, text: delta });
      }
      if (snapshot !== undefined) applySnapshot(bucket, snapshot);
      // 身份未确定：不分配 ordinal、不下发任何 tool_calls 帧
    }

    /** 共享辅助函数：按 item 维度补齐 message 正文增量 */
    function* emitItemTextDiff(itemKey: string, fullText: string): Generator<Obj> {
      if (!fullText) return;
      const sentLen = itemSentLengths.get(itemKey) ?? 0;
      if (fullText.length > sentLen) {
        const diff = fullText.slice(sentLen);
        if (!sentRoleDelta) {
          yield makeChunk({ role: "assistant" });
          sentRoleDelta = true;
        }
        yield makeChunk({ content: diff });
        itemSentLengths.set(itemKey, fullText.length);
        totalContentSentLength += diff.length;
      }
    }

    try {
      for await (const frame of readSseFrames(new Response(source))) {
        let shouldBreak = false;
        for (const line of frame.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const dataPayload = trimmed.slice(5).trim();
          if (dataPayload === "[DONE]") {
            shouldBreak = true;
            break;
          }
          const rawEvent = parseSseDataLineObject(line);
          if (!rawEvent || Array.isArray(rawEvent)) continue;
          const event: Record<string, any> = rawEvent;

          // billing 帧（chatBillingSse: {billing: ...}）：原样透传
          if ("billing" in event && (!event.type || event.type === "billing")) {
            yield event;
            continue;
          }

          const type = String(event.type ?? "");

          // 元数据提取
          if (type === "response.created") {
            const resp = event.response as Record<string, unknown> | undefined;
            if (resp) {
              if (typeof resp.id === "string" && resp.id) id = resp.id;
              if (typeof resp.model === "string" && resp.model) model = resp.model;
              if (typeof resp.created_at === "number") created = resp.created_at;
            }
            continue;
          }

          // 正文增量
          if (type === "response.output_text.delta" && typeof event.delta === "string") {
            if (!sentRoleDelta) {
              yield makeChunk({ role: "assistant" });
              sentRoleDelta = true;
            }
            yield makeChunk({ content: event.delta });
            totalContentSentLength += event.delta.length;
            const itemKey =
              typeof event.item_id === "string" && event.item_id
                ? event.item_id
                : typeof event.output_index === "number"
                  ? `idx_${event.output_index}`
                  : "default_msg";
            const prev = itemSentLengths.get(itemKey) ?? 0;
            itemSentLengths.set(itemKey, prev + event.delta.length);
            continue;
          }

          // 推理增量
          if (
            (type === "response.reasoning_text.delta" || type === "response.reasoning.delta") &&
            typeof event.delta === "string"
          ) {
            yield makeChunk({ reasoning_content: event.delta });
            reasoningSent += event.delta;
            continue;
          }

          // 工具调用创建或文本 item 补正文
          if (type === "response.output_item.added" || type === "response.output_item.done") {
            const item = event.item as Record<string, any> | undefined;
            if (item?.type === "message") {
              const itemText = extractOutputTextFromItem(item);
              if (itemText) {
                const itemKey =
                  typeof item.id === "string" && item.id
                    ? item.id
                    : typeof event.output_index === "number"
                      ? `idx_${event.output_index}`
                      : "default_msg";
                for (const chunk of emitItemTextDiff(itemKey, itemText)) {
                  yield chunk;
                }
              }
              continue;
            }

            if (item?.type === "function_call") {
              yield* applyIdentity(
                collectKeys(event),
                {
                  callId: typeof item.call_id === "string" ? item.call_id : "",
                  itemId: typeof item.id === "string" ? item.id : "",
                  name: typeof item.name === "string" ? item.name : "",
                },
                normalizeResponsesToolArguments(item.arguments),
              );
            }
            continue;
          }

          // 工具调用参数增量：身份未定 → 进待定桶；身份已定 → 落到对应工具
          if (type === "response.function_call_arguments.delta") {
            yield* handleArgumentsEvent(event, false);
            continue;
          }

          // 参数快照结束：合并快照，不重复追加已发送增量
          if (type === "response.function_call_arguments.done") {
            yield* handleArgumentsEvent(event, true);
            continue;
          }

          // 显式终局完成：校验 status，从 completed 补齐未流出的正文/reasoning/工具，构建完成帧并缓住
          if (type === "response.completed") {
            sawTerminal = true;
            const resp = event.response as Record<string, unknown> | undefined;
            if (resp) {
              if (typeof resp.id === "string" && resp.id && (!id || id === "chatcmpl-responses")) {
                id = resp.id;
              }
              if (typeof resp.model === "string" && resp.model && !model) model = resp.model;
              if (typeof resp.created_at === "number") created = resp.created_at;
            }
            const envelopeStatus = typeof resp?.status === "string" ? resp.status.toLowerCase() : undefined;

            // 计费与终局对齐：failed / incomplete 在任何模式（默认或严格）下均无条件判定为失败
            if (envelopeStatus === "failed" || envelopeStatus === "incomplete") {
              const nestedError = resp?.error;
              const incompleteReason = (resp?.incomplete_details as any)?.reason;
              const msg =
                typeof nestedError === "string"
                  ? nestedError
                  : (nestedError as any)?.message ||
                    incompleteReason ||
                    (envelopeStatus === "incomplete"
                      ? "Responses API response incomplete"
                      : "Responses API response failed");
              terminalErrorChunk = makeErrorChunk({
                message: String(msg),
                code: `response_${envelopeStatus}`,
                type: "responses_stream_error",
              });
              continue;
            }

            // requireResponsesCompleted 严格开关：仅在显式开启时拒绝除 completed 以外的其它状态（如 cancelled）
            if (
              options?.requireResponsesCompleted &&
              envelopeStatus !== undefined &&
              envelopeStatus !== "completed"
            ) {
              terminalErrorChunk = makeErrorChunk({
                message: `Responses stream ended with status "${envelopeStatus}".`,
                code: `response_${envelopeStatus}`,
                type: "responses_stream_error",
              });
              continue;
            }

            // 1. 从 completed.output 按 item 补齐 message 正文
            const outputItems = Array.isArray(resp?.output) ? resp.output : [];
            let itemIdx = 0;
            for (const outItem of outputItems) {
              if (outItem && typeof outItem === "object" && outItem.type === "message") {
                const itemText = extractOutputTextFromItem(outItem);
                const itemKey =
                  typeof outItem.id === "string" && outItem.id
                    ? outItem.id
                    : `output_${itemIdx}`;
                for (const chunk of emitItemTextDiff(itemKey, itemText)) {
                  yield chunk;
                }
              }
              itemIdx++;
            }

            // 2. 从 completed.output 补齐 reasoning
            const completedReasoning = extractReasoningFromResponseOutput(resp);
            if (completedReasoning) {
              if (!reasoningSent) {
                yield makeChunk({ reasoning_content: completedReasoning });
                reasoningSent = completedReasoning;
              } else if (
                completedReasoning.startsWith(reasoningSent) &&
                completedReasoning.length > reasoningSent.length
              ) {
                const diff = completedReasoning.slice(reasoningSent.length);
                yield makeChunk({ reasoning_content: diff });
                reasoningSent = completedReasoning;
              }
            }

            // 3. 从 completed.output 统一走 applyIdentity 恢复或补齐工具快照
            let itemOutputIdx = 0;
            for (const outItem of outputItems) {
              if (outItem && typeof outItem === "object" && outItem.type === "function_call") {
                const itemKeys: string[] = [];
                if (typeof outItem.call_id === "string" && outItem.call_id) itemKeys.push(outItem.call_id);
                if (typeof outItem.id === "string" && outItem.id) itemKeys.push(outItem.id);
                itemKeys.push(`idx_${itemOutputIdx}`);

                yield* applyIdentity(
                  itemKeys,
                  {
                    callId: typeof outItem.call_id === "string" ? outItem.call_id : "",
                    itemId: typeof outItem.id === "string" ? outItem.id : "",
                    name: typeof outItem.name === "string" ? outItem.name : "",
                  },
                  normalizeResponsesToolArguments(outItem.arguments),
                );
              }
              itemOutputIdx++;
            }

            // 4. 检查是否存在损坏快照（复审 HIGH 1：非前缀参数快照必须显式失败）
            // 原因：下游已经收到部分坏参数增量（不可撤回），而后续快照不是该前缀的延续。
            // 此时下游解析必然失败，绝不能在末尾输出 finish_reason: "tool_calls" 假装成功。
            const corrupted = toolList.find((t) => t.corruptedSnapshot);
            if (corrupted && corrupted.corruptedSnapshot) {
              terminalErrorChunk = makeErrorChunk({
                message: `Tool call arguments snapshot conflict: downstream already received "${corrupted.corruptedSnapshot.sent}", which is not a prefix of snapshot "${corrupted.corruptedSnapshot.snapshot}".`,
                code: "tool_arguments_snapshot_conflict",
                type: "responses_stream_error",
              });
              continue;
            }

            // 5. 终局仍有身份未定的待定桶 → 显式报错，绝不以 finish_reason: "tool_calls" 收尾
            // 这些参数从未下发过，下游拿不到任何工具调用；静默成功会让客户端少一个调用。
            const unresolvedBuckets = pendingBuckets.filter(
              (bucket) =>
                bucket.announced ||
                bucket.fragments.length > 0 ||
                bucket.snapshot !== undefined,
            );
            const unemittedTools = toolList.filter((t) => !t.headerEmitted);
            if (unresolvedBuckets.length > 0 || unemittedTools.length > 0) {
              terminalErrorChunk = makeErrorChunk({
                message: `Tool call identity unresolved: ${unresolvedBuckets.length} tool argument stream(s) and ${unemittedTools.length} tool call(s) never received a usable call_id/name.`,
                code: "tool_call_identity_unresolved",
                type: "responses_stream_error",
              });
              continue;
            }

            const usage = projectChatUsage(resp?.usage);
            const finishReason = toolList.length > 0 ? "tool_calls" : "stop";
            // 缓住完成帧，不直接 return，继续读上游以透传服务端 billing 帧
            pendingTerminalChunk = makeChunk({}, finishReason, usage ? { usage } : undefined);
            continue;
          }

          // 显式失败或异常事件：暂存错误帧，继续读上游透传可能的 billing 帧
          if (type === "response.failed" || type === "error" || type === "response.incomplete") {
            sawTerminal = true;
            const errorObj =
              (event.response as any)?.error ??
              (event.response as any)?.incomplete_details ??
              event.error ??
              event;
            const failure = toResponsesStreamFailure(errorObj);
            terminalErrorChunk = makeErrorChunk({
              message: failure?.message ?? `Responses stream failed with event "${type}".`,
              code: failure?.code ?? type.replace(/\./g, "_"),
              type: failure?.type ?? "responses_stream_error",
            });
            continue;
          }
        }
        if (shouldBreak) break;
      }

      // 上游到达 [DONE] 或 clean EOF 终态：
      if (terminalErrorChunk) {
        yield terminalErrorChunk;
        yield { raw: "data: [DONE]\n\n" };
        return;
      }

      if (pendingTerminalChunk) {
        yield pendingTerminalChunk;
        yield { raw: "data: [DONE]\n\n" };
        return;
      }

      // 未收到 completed 且未收到 failed 的干净 EOF：下发可诊断错误帧
      if (!sawTerminal) {
        yield makeErrorChunk({
          message: "Responses stream ended unexpectedly without a terminal event.",
          code: "stream_truncated",
          type: "responses_stream_error",
        });
        yield { raw: "data: [DONE]\n\n" };
        return;
      }

      yield { raw: "data: [DONE]\n\n" };
    } finally {
      try {
        await reader.cancel();
      } catch {
        /* preserve upstream failure */
      }
      try {
        reader.releaseLock();
      } catch {
        /* already released */
      }
    }
  }

  const events = project();
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const next = await events.next();
          if (cancelled) return;
          if (next.done) {
            controller.close();
          } else {
            const val = next.value;
            if (val.raw) {
              controller.enqueue(encoder.encode(val.raw));
            } else {
              const prefix = val.type ? `event: ${val.type}\n` : "";
              controller.enqueue(encoder.encode(`${prefix}data: ${JSON.stringify(val)}\n\n`));
            }
          }
        } catch (error) {
          if (!cancelled) controller.error(error);
        }
      },
      async cancel(reason) {
        cancelled = true;
        try {
          await reader.cancel(reason);
        } finally {
          await events.return(undefined);
          try {
            reader.releaseLock();
          } catch {
            /* already released */
          }
        }
      },
    },
    { highWaterMark: 0 },
  );
}
