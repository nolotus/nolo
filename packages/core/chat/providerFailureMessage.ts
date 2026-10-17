/**
 * Human-readable summary of a failed OpenAI-compatible HTTP response.
 *
 * Most gateways answer `{ error: { message } }` and the message is the whole
 * story. OpenCode Go does not: a rejected request comes back as a *success*-
 * shaped completion with an empty assistant message and no `error` field —
 *
 *   HTTP 400 {"id":"chatcmpl_…","choices":[{"index":0,
 *             "message":{"role":"assistant"},"finish_reason":null}]}
 *
 * — so dumping the raw body left users staring at what looks like a normal
 * reply. Name that case explicitly, and when the request carried images say so,
 * since an unsupported image payload is the failure that produces it.
 *
 * Dependency-free: shared by every provider adapter that throws on !res.ok.
 */
import { clipCompactText } from "../clipCompactText";
import { isRecord } from "../isRecord";
import { hasImageParts } from "./imageParts";

const RAW_BODY_CLIP = 400;

export function describeProviderFailure(args: {
  body: unknown;
  hadImageParts?: boolean;
}): string {
  const clipped = clipCompactText(JSON.stringify(args.body) ?? "", RAW_BODY_CLIP, "…");

  const error = isRecord(args.body) ? args.body.error : undefined;
  const nestedMessage = isRecord(error) ? error.message : undefined;
  // LithosAI 引擎的「扁平」错误信封把 message 放在顶层而不是 error 里：
  //   {"object":"error","message":"inference error: BadRequest - …",
  //    "type":"invalid_request_error","code":400}
  // 只认 body.error.message 时这类回复会退化成裸 JSON 串，用户看到的是机器
  // 报文而不是可读原因。顶层 message（扁平信封）与 body.error.message（正规
  // 信封）覆盖两种形态；嵌套优先，保持既有读法不变。
  const flatMessage = isRecord(args.body) ? args.body.message : undefined;
  const message = nestedMessage ?? flatMessage;
  if (typeof message === "string" && message) return `${message} | ${clipped}`;

  const looksLikeCompletion =
    isRecord(args.body) && Array.isArray(args.body.choices) && error === undefined;
  if (looksLikeCompletion) {
    const imageHint = args.hadImageParts
      ? "；该请求带了图片，多半是这个模型或这条网关路由不接受图片输入"
      : "";
    return `上游拒绝了请求但没给错误信息（响应体是一个空的 chat.completion）${imageHint} | ${clipped}`;
  }

  return clipped;
}

/**
 * The error every OpenAI-compatible adapter throws on a non-OK response.
 *
 * Owns the raw-body JSON parse too: adapters used to each inline their own
 * try/catch and then their own `JSON.stringify` of the result, which is how the
 * two of them ended up formatting the same failure differently.
 */
export function providerHttpFailure(args: {
  /** Adapter prefix, e.g. "local provider" or "desktop platform provider". */
  label: string;
  status: number;
  raw: string;
  messages: readonly { content?: unknown }[];
}): Error {
  let body: unknown = args.raw;
  try {
    body = JSON.parse(args.raw);
  } catch {
    // keep raw text
  }
  return new Error(
    `${args.label} failed: HTTP ${args.status} ${describeProviderFailure({
      body,
      hadImageParts: hasImageParts(args.messages),
    })}`,
  );
}
