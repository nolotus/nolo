/**
 * GLB 字节 → three 场景对象。
 *
 * 分两段以便可测：
 * 1. 取字节：HTTP 失败、空响应、不是 GLB 二进制头 → 明确错误码；
 * 2. 解析：`GLTFLoader.parseAsync`，把 Draco / KTX2 这类「需要额外解码器」的失败
 *    翻成用户能懂的一句话，而不是把 three 的原始异常直接甩到界面上。
 *
 * 解析器默认实现按需 `import()`，所以本模块被 SSR 引入时不会拉起 three。
 */
import type { Object3D } from "three";
import { isGlbBinary } from "./glbViewerModel";

export type GlbLoadErrorCode =
  | "http_error"
  | "empty_response"
  | "invalid_glb"
  | "draco_unsupported"
  | "ktx2_unsupported"
  | "parse_failed";

/** 错误码 → 界面上的短标签（码本身留在 `data-error-code` / tooltip 里给报障用）。 */
export const GLB_ERROR_CODE_LABELS: Record<GlbLoadErrorCode, string> = {
  http_error: "下载失败",
  empty_response: "文件为空",
  invalid_glb: "不是有效的 GLB",
  draco_unsupported: "需要 Draco 解码器",
  ktx2_unsupported: "需要 KTX2 解码器",
  parse_failed: "解析失败",
};

export const glbErrorCodeLabel = (code: GlbLoadErrorCode): string =>
  GLB_ERROR_CODE_LABELS[code] ?? "加载失败";

export interface GlbLoadError {
  code: GlbLoadErrorCode;
  message: string;
  /** 仅 `http_error` 有：HTTP 状态码。 */
  status?: number;
}

export type GlbLoadResult =
  | { ok: true; scene: Object3D }
  | { ok: false; error: GlbLoadError };

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? "");

/** 把解析阶段的异常翻成错误码 + 人话（Draco/KTX2 是本阶段明确不支持的压缩扩展）。 */
export const describeGlbParseFailure = (rawMessage: string): GlbLoadError => {
  const lower = rawMessage.toLowerCase();
  if (lower.includes("draco") || lower.includes("drc")) {
    return {
      code: "draco_unsupported",
      message:
        "这个 GLB 用了 Draco 压缩，本阶段没有接 Draco 解码器，无法预览。请导出未压缩的 GLB。",
    };
  }
  if (lower.includes("ktx2") || lower.includes("basis")) {
    return {
      code: "ktx2_unsupported",
      message:
        "这个 GLB 的贴图用了 KTX2/Basis 压缩，本阶段没有接 KTX2 解码器，无法预览。请导出未压缩贴图的 GLB。",
    };
  }
  return {
    code: "parse_failed",
    message: `模型解析失败：${rawMessage || "未知错误"}。文件可能已损坏，或不是有效的 glTF 2.0 二进制。`,
  };
};

export interface GlbLoadDeps {
  /** 取字节的实现（测试注入）。 */
  fetchImpl?: (url: string) => Promise<Response>;
  /** 解析实现（测试注入）；缺省走 three 的 GLTFLoader。 */
  parseBuffer?: (buffer: ArrayBuffer) => Promise<Object3D>;
}

const defaultParseBuffer = async (buffer: ArrayBuffer): Promise<Object3D> => {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(buffer, "");
  return gltf.scene;
};

export const loadGlbFromUrl = async (
  url: string,
  deps: GlbLoadDeps = {},
): Promise<GlbLoadResult> => {
  const fetchImpl = deps.fetchImpl ?? ((input: string) => fetch(input));
  const parseBuffer = deps.parseBuffer ?? defaultParseBuffer;

  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "http_error",
        message: `模型下载失败：${errorMessage(error) || "网络不可用"}。`,
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: "http_error",
        status: response.status,
        message: `模型下载失败：HTTP ${response.status}${
          response.statusText ? ` ${response.statusText}` : ""
        }。`,
      },
    };
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await response.arrayBuffer();
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "http_error",
        message: `模型内容读取失败：${errorMessage(error) || "读取中断"}。`,
      },
    };
  }

  if (buffer.byteLength === 0) {
    return {
      ok: false,
      error: { code: "empty_response", message: "模型文件是空的（0 字节）。" },
    };
  }

  // 内容真值：魔数不对就不是 GLB，不管扩展名/MIME 说什么。
  if (!isGlbBinary(buffer)) {
    return {
      ok: false,
      error: {
        code: "invalid_glb",
        message:
          "这不是有效的 .glb 文件（缺少 glTF 二进制头），无法预览。可能是扩展名与实际格式不一致，或文件已损坏。",
      },
    };
  }

  try {
    const scene = await parseBuffer(buffer);
    return { ok: true, scene };
  } catch (error) {
    return { ok: false, error: describeGlbParseFailure(errorMessage(error)) };
  }
};
