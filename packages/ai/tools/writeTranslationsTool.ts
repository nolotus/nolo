/**
 * writeTranslationsTool.ts
 *
 * 「翻译是 agent 的能力」写回链路：模型自己翻译（不调外部翻译模型），再把译文按
 * 分段 id 写回媒体任务；服务端只校验 + 落库（POST /api/media-jobs/:jobId/translations）。
 *
 * 模型可见参数只有 jobId / targetLang / translations 三项，**不暴露任何密钥、票据或
 * 执行代次字段**（confirmationToken / expectedExecutionRevision 由受信任的 UI 确认路径
 * 注入，模型入口另有 stripModelToolArgs 统一剥离）。
 */

import { callToolApi } from "./toolApiClient";

/**
 * 单次提交的护栏：超限时本地报错并给出可执行的缩小批次提示，避免把整篇译文
 * 塞进一个超长 payload 后再吃服务端 400（服务端仍有自己的校验）。
 */
export const MAX_TRANSLATIONS_PER_CALL = 200;
export const MAX_TRANSLATION_CHARS_PER_CALL = 120_000;
/** 给模型的分批建议（写进工具描述，也用于超限报错文案）。 */
export const RECOMMENDED_BATCH_SEGMENTS = "20-50";

export const buildWriteTranslationsPath = (jobId: string): string =>
  `/api/media-jobs/${encodeURIComponent(jobId)}/translations`;

export const writeTranslationsSchema = {
  name: "writeTranslations",
  description:
    "把你自己翻译好的分段译文写回媒体任务（译文由你生成，本工具只负责写回，不调用任何翻译模型）。标准流程：① 用 readArtifact 分页读取该任务的产物，拿到每段的 id 与原文 text；② 分批翻译；③ 调用本工具提交 { jobId, targetLang, translations: { 分段id: 译文 } }；④ 按返回的 missing 里列出的分段 id 继续翻译并再次提交，直到 complete=true（或 missing 为空）；⑤ 最后用 exportDocument({ jobId, format: 'docx', lang: 'both' }) 导出「原文+译文」文档。长音频/长视频必须分批：单次建议 20-50 段（上限 200 段），不要把整篇译文一次性塞进一个超长 payload；若因超长或分段 id 无效被拒，按提示缩小批次或改用 readArtifact 重新取到的有效分段 id 重试。",
  parameters: {
    type: "object",
    properties: {
      jobId: {
        type: "string",
        description: "媒体任务 ID（需已完成转写）。",
      },
      targetLang: {
        type: "string",
        description:
          "译文对应的目标语言代码（如 zh、en、ja、ko 等）。提交的每条译文都必须与它一致，不能混入其它语言。",
      },
      translations: {
        type: "object",
        description:
          "本批译文的映射：key 为 readArtifact 返回的分段 id，value 为该分段的译文文本。只放本次已翻译完成的片段（不要放空字符串、不要放未翻译的占位内容）；单次建议 20-50 段。",
        additionalProperties: { type: "string" },
      },
    },
    required: ["jobId", "targetLang", "translations"],
  },
};

export type WriteTranslationsToolInput = {
  jobId: string;
  targetLang: string;
  translations: Record<string, string>;
};

export type WriteTranslationsToolResult = {
  jobId: string;
  targetLang: string;
  stored: number;
  missing: string[];
  complete: boolean;
  summary: string;
  llmContext: string;
  rawData: unknown;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** 校验并返回原样（不 trim、不改写）的译文映射；任何不合法的条目直接报错，绝不静默丢弃。 */
const normalizeTranslations = (
  translations: unknown,
): Record<string, string> => {
  if (!isPlainRecord(translations)) {
    throw new Error(
      "writeTranslations 工具必须提供 translations（分段 id → 译文 的对象）",
    );
  }
  const entries = Object.entries(translations);
  if (entries.length === 0) {
    throw new Error(
      "writeTranslations 工具的 translations 不能为空：请先用 readArtifact 读取分段，翻译后再提交",
    );
  }
  const emptyKeys: string[] = [];
  const emptyValues: string[] = [];
  let totalChars = 0;
  for (const [segmentId, text] of entries) {
    if (typeof segmentId !== "string" || segmentId.trim() === "") {
      emptyKeys.push(String(segmentId));
      continue;
    }
    if (typeof text !== "string" || text.trim() === "") {
      emptyValues.push(segmentId);
      continue;
    }
    totalChars += text.length;
  }
  if (emptyKeys.length > 0) {
    throw new Error(
      `writeTranslations 的分段 id 不能为空：${emptyKeys.join(", ")}（请用 readArtifact 返回的 id）`,
    );
  }
  if (emptyValues.length > 0) {
    throw new Error(
      `writeTranslations 不接受空译文：分段 ${emptyValues.slice(0, 20).join(", ")}` +
        (emptyValues.length > 20 ? " 等" : "") +
        " 的译文为空或只有空白字符，请翻译后再提交（不要提交占位内容）。",
    );
  }
  if (entries.length > MAX_TRANSLATIONS_PER_CALL) {
    throw new Error(
      `writeTranslations 单次提交的分段数过多（${entries.length} 段，上限 ${MAX_TRANSLATIONS_PER_CALL} 段）：请拆成多次调用，单次建议 ${RECOMMENDED_BATCH_SEGMENTS} 段后重试。`,
    );
  }
  if (totalChars > MAX_TRANSLATION_CHARS_PER_CALL) {
    throw new Error(
      `writeTranslations 单次提交的译文总量过长（${totalChars} 字符，上限 ${MAX_TRANSLATION_CHARS_PER_CALL}）：请拆成多次调用，单次建议 ${RECOMMENDED_BATCH_SEGMENTS} 段后重试。`,
    );
  }
  return translations as Record<string, string>;
};

const extractInvalidIdGroups = (
  details: unknown,
): { unknown: string[]; invalid: string[]; legacy: string[] } => {
  const pick = (key: string): string[] => {
    if (!isPlainRecord(details)) return [];
    const value = details[key];
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
  };
  return {
    unknown: [...pick("unknownSegmentIds"), ...pick("segmentIds")],
    invalid: [...pick("invalidSegmentIds")],
    legacy: [
      ...pick("missing"),
      ...pick("notFoundSegmentIds"),
    ],
  };
};

/** 保留 callToolApi 抛出的 status/code/details（下游 UI/日志依赖），只换成可理解的文案。 */
const withUnderstandableMessage = (err: any, message: string): Error => {
  const next = new Error(message) as Error & {
    status?: number;
    code?: string;
    details?: unknown;
  };
  if (err instanceof Error) {
    next.name = err.name;
    (next as any).cause = err;
  }
  next.status = err?.status;
  next.code = err?.code;
  next.details = err?.details;
  return next;
};

const describeServerRejection = (err: any, targetLang: string): string | null => {
  const status = err?.status;
  const code = typeof err?.code === "string" ? err.code : undefined;
  const serverMessage =
    typeof err?.message === "string" && err.message.trim()
      ? err.message.trim()
      : "服务端未给出具体原因";

  if (code === "TRANSLATION_EDITED") {
    return `该媒体任务已存在其它语言的手工译文编辑，为避免覆盖人工修改，服务端拒绝了本次自动写回（409 TRANSLATION_EDITED）。请不要重复提交，先向用户确认是保留其手工译文还是改用其它 targetLang；详情：${serverMessage}`;
  }

  if (code === "NO_RESULT") {
    return `该媒体任务还没有可写回的转写产物（409 NO_RESULT）。请先用 transcribe 完成转写，再翻译并调用 writeTranslations；详情：${serverMessage}`;
  }

  if (status === 409) {
    return `服务端以 409 拒绝了本次译文写回${
      code ? `（${code}）` : ""
    }：该任务当前状态不允许自动写回。请先用 readArtifact 核对该任务的转写/译文状态，必要时向用户说明后再重试；详情：${serverMessage}`;
  }

  if (code === "INVALID_INPUT" || status === 400) {
    const groups = extractInvalidIdGroups(err?.details);
    const hints: string[] = [];
    if (groups.unknown.length > 0) {
      hints.push(
        `以下 segmentId 不在本任务的转写产物中（服务端列出前 20 个）：${groups.unknown
          .slice(0, 20)
          .join(", ")}；请用 readArtifact 重新读取该任务的有效分段 id`,
      );
    }
    if (groups.invalid.length > 0) {
      hints.push(
        `以下分段的译文为空/纯空白或超过服务端单段长度上限（服务端列出前 20 个）：${groups.invalid
          .slice(0, 20)
          .join(", ")}；请缩短该段译文后重新提交`,
      );
    }
    if (groups.legacy.length > 0) {
      hints.push(`服务端报告的缺失/无效分段：${groups.legacy.slice(0, 20).join(", ")}`);
    }
    if (hints.length === 0) {
      hints.push(
        "请核对 targetLang 是否为受支持的语言、translations 的 key 是否为该任务的有效 segmentId、译文是否为空或超长",
      );
    }
    return `服务端拒绝了本次译文写入（400 INVALID_INPUT），目标语言 ${targetLang}：${hints.join("；")}。详情：${serverMessage}`;
  }

  return null;
};

const buildSummary = (params: {
  jobId: string;
  targetLang: string;
  submitted: number;
  stored: number;
  missing: string[];
  complete: boolean;
}): string => {
  const { jobId, targetLang, submitted, stored, missing, complete } = params;
  if (complete) {
    return `译文已全部写回（jobId=${jobId}，语言=${targetLang}）：本次提交 ${submitted} 段，服务端累计已存 ${stored} 段，missing 为空（complete=true）。可以调用 exportDocument({ jobId, format: 'docx', lang: 'both' }) 导出「原文+译文」文档。`;
  }
  const preview = missing.slice(0, 20).join(", ");
  const suffix = missing.length > 20 ? " 等" : "";
  if (missing.length === 0) {
    return `本次提交 ${submitted} 段（jobId=${jobId}，语言=${targetLang}，服务端累计已存 ${stored} 段），但服务端未标记 complete。请重新用 readArtifact 核对分段后再次调用 writeTranslations 补齐。`;
  }
  return `本次提交 ${submitted} 段（jobId=${jobId}，语言=${targetLang}，服务端累计已存 ${stored} 段），仍有 ${missing.length} 段缺少译文：${preview}${suffix}。请继续翻译这些分段并再次调用 writeTranslations，直到 complete=true。`;
};

export async function writeTranslationsFunc(
  input: WriteTranslationsToolInput,
  thunkApi: any,
): Promise<WriteTranslationsToolResult> {
  const { jobId, targetLang, translations } = input ?? {};
  if (typeof jobId !== "string" || jobId.trim() === "") {
    throw new Error("writeTranslations 工具必须提供 jobId");
  }
  if (typeof targetLang !== "string" || targetLang.trim() === "") {
    throw new Error("writeTranslations 工具必须指定 targetLang（目标语言）");
  }
  const normalized = normalizeTranslations(translations);

  let data: any;
  try {
    data = await callToolApi(
      thunkApi,
      buildWriteTranslationsPath(jobId),
      {
        targetLang,
        translations: normalized,
      },
      { withAuth: true },
    );
  } catch (err: any) {
    const message = describeServerRejection(err, targetLang);
    if (message) throw withUnderstandableMessage(err, message);
    throw err;
  }

  const stored = typeof data?.stored === "number" ? data.stored : 0;
  const missing = Array.isArray(data?.missing)
    ? data.missing.filter((item: unknown): item is string => typeof item === "string")
    : [];
  const complete = Boolean(data?.complete);
  const resolvedJobId = typeof data?.jobId === "string" ? data.jobId : jobId;
  const resolvedTargetLang =
    typeof data?.targetLang === "string" ? data.targetLang : targetLang;

  return {
    jobId: resolvedJobId,
    targetLang: resolvedTargetLang,
    stored,
    missing,
    complete,
    llmContext: JSON.stringify({
      jobId: resolvedJobId, targetLang: resolvedTargetLang,
      submitted: Object.keys(normalized).length, stored, complete,
      missingCount: missing.length, missing: missing.slice(0, 20),
      nextTool: complete ? "exportDocument" : "readArtifact",
      instruction: complete
        ? "exportDocument({ jobId, format: 'docx', lang: 'both' })"
        : "Read missing segment ids with readArtifact, translate and call writeTranslations again; missing is a preview only.",
    }),
    summary: buildSummary({
      jobId: resolvedJobId,
      targetLang: resolvedTargetLang,
      submitted: Object.keys(normalized).length,
      stored,
      missing,
      complete,
    }),
    rawData: data,
  };
}
