import { readFile } from "node:fs/promises";
import type { Word, Cue } from "./types";
import { chunkWords } from "./chunk";
import { formatSRT } from "./srt";

export type SttResult = {
  text: string; words: Word[]; durationSec: number; language?: string;
  provider: "grok" | "deepgram" | "scribe" | "cloudflare";
  model: "grok-voice-transcribe-2.0" | "nova-3" | "scribe_v2" | "@cf/openai/whisper";
  vadRetried?: boolean;
};

export async function transcribeWithGrok(opts: {
  apiKey: string; filePath: string; mimeType: string; language?: string;
  keyterms?: string[]; vadThreshold?: number; fetchImpl?: (input: URL | RequestInfo, init?: BunFetchRequestInit | RequestInit) => Promise<Response>;
}): Promise<SttResult> {
  const data = await readFile(opts.filePath);
  const request = async (vadThreshold?: number): Promise<SttResult> => {
    const form = new FormData();
    form.append("model", "grok-voice-transcribe-2.0");
    form.append("format", String(Boolean(opts.language)));
    if (opts.language) form.append("language", opts.language);
    for (const term of opts.keyterms ?? []) form.append("keyterm", term);
    if (vadThreshold !== undefined) form.append("vad_threshold", String(vadThreshold));
    form.append("file", new Blob([new Uint8Array(data)], { type: opts.mimeType }), opts.filePath.split(/[\\/]/).pop() || "audio");
    const response = await (opts.fetchImpl ?? fetch)("https://api.x.ai/v1/stt", { method: "POST", headers: { Authorization: `Bearer ${opts.apiKey}` }, body: form });
    if (!response.ok) throw new Error(`Grok STT HTTP ${response.status}: ${(await response.text()).slice(0, 1000)}`);
    const result: any = await response.json();
    return {
      text: String(result.text ?? ""),
      words: Array.isArray(result.words) ? result.words.map((w: any) => ({ word: String(w.text ?? ""), start: Number(w.start) || 0, end: Number(w.end) || 0 })) : [],
      durationSec: Number(result.duration) || 0,
      language: typeof result.language === "string" ? result.language : undefined,
      provider: "grok", model: "grok-voice-transcribe-2.0",
    };
  };
  const result = await request(opts.vadThreshold);
  if (!result.text.trim() && result.durationSec >= 2 && opts.vadThreshold === undefined) return { ...await request(0.15), vadRetried: true };
  return result;
}

export function mapDeepgramLanguage(language?: string): string {
  if (!language) return "multi";
  const normalized = language.trim().toLowerCase();
  if (normalized === "ru") return "ru";
  if (normalized === "en") return "en";
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-tw") return "zh";
  return "multi";
}

/**
 * Deepgram 原生 `/v1/listen`（Token 鉴权 + 原始 bytes）。
 * 注意：**不收 keyterms**——本仓无核实证据表明该端点接受术语参数，宁可明确不支持，
 * 也不留一个静默 no-op 的假能力（术语提示只有 grok 直连的 /v1/stt `keyterm` 字段支持）。
 */
export async function transcribeWithDeepgram(opts: {
  apiKey: string; filePath: string; mimeType: string; language?: string;
  fetchImpl?: (input: URL | RequestInfo, init?: BunFetchRequestInit | RequestInit) => Promise<Response>;
}): Promise<SttResult> {
  const data = await readFile(opts.filePath);
  const lang = mapDeepgramLanguage(opts.language);
  const url = `https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true&language=${encodeURIComponent(lang)}`;

  const response = await (opts.fetchImpl ?? fetch)(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${opts.apiKey}`,
      "Content-Type": opts.mimeType,
    },
    body: data,
  });

  if (!response.ok) {
    let errorText = "";
    try {
      errorText = (await response.text()).slice(0, 1000);
    } catch {
      // ignore read error
    }
    // 错误信息不得包含 apiKey
    if (opts.apiKey && opts.apiKey.length >= 3) {
      errorText = errorText.split(opts.apiKey).join("***");
    }
    throw new Error(`Deepgram STT HTTP ${response.status}: ${errorText}`);
  }

  const result: any = await response.json();
  const alt = result?.results?.channels?.[0]?.alternatives?.[0];
  const text = String(alt?.transcript ?? "");

  // 空 text 一律抛错（让上层降级），实测 nova-3 遇到中文或集合外语言片段会返回 0 词
  if (!text.trim()) {
    throw new Error("Deepgram STT returned empty transcript");
  }

  // 实测样本确认：Deepgram nova-3 返回的 words[].start 与 words[].end 单位均为秒 (seconds)，直接使用无需换算
  const rawWords = Array.isArray(alt?.words) ? alt.words : [];
  const words: Word[] = rawWords.map((w: any) => ({
    word: String(w?.punctuated_word ?? w?.word ?? ""),
    start: Number(w?.start) || 0,
    end: Number(w?.end) || 0,
  }));

  const durationSec = Number(result?.metadata?.duration) || 0;

  return {
    text,
    words,
    durationSec,
    language: typeof opts.language === "string" ? opts.language : undefined,
    provider: "deepgram",
    model: "nova-3",
  };
}

/** 读取错误响应体并抹掉密钥：抛出的错误信息绝不携带 apiKey / apiToken。 */
async function readRedactedErrorBody(response: Response, secret: string): Promise<string> {
  let errorText = "";
  try {
    errorText = (await response.text()).slice(0, 1000);
  } catch {
    // 读取失败就用空字符串，绝不让原始异常逃逸出去
  }
  if (secret && secret.length >= 3) errorText = errorText.split(secret).join("***");
  return errorText;
}

/**
 * Scribe 的 `language_code` 只接受 ISO 639-1/639-3 短码；把 `zh-CN` 这类区域变体归一化到基础码，
 * 认不出的格式一律**不发送**该字段（让服务端自动识别），而不是抛一个必被拒的参数。
 */
export function mapScribeLanguage(language?: string): string | undefined {
  if (!language) return undefined;
  const base = language.trim().toLowerCase().split(/[-_]/)[0];
  if (!base) return undefined;
  const iso639_2To1: Record<string, string> = {
    cmn: "zh", zho: "zh", chi: "zh", yue: "zh", rus: "ru", eng: "en", jpn: "ja", kor: "ko",
    spa: "es", fra: "fr", deu: "de", ita: "it", por: "pt", ukr: "uk", ara: "ar", hin: "hi",
  };
  const mapped = iso639_2To1[base] ?? base;
  return /^[a-z]{2,3}$/.test(mapped) ? mapped : undefined;
}

/**
 * Scribe v2 原生 `/v1/speech-to-text`（xi-api-key 鉴权 + multipart/form-data）。
 * 端点与字段名取自 ElevenLabs 官方 API 参考：`model_id` / `language_code` / `timestamps_granularity` / `tag_audio_events`。
 */
export async function transcribeWithScribe(opts: {
  apiKey: string; filePath: string; mimeType: string; language?: string;
  fetchImpl?: (input: URL | RequestInfo, init?: BunFetchRequestInit | RequestInit) => Promise<Response>;
}): Promise<SttResult> {
  const data = await readFile(opts.filePath);
  const languageCode = mapScribeLanguage(opts.language);
  const form = new FormData();
  form.append("model_id", "scribe_v2");
  if (languageCode) form.append("language_code", languageCode);
  form.append("timestamps_granularity", "word");
  form.append("tag_audio_events", "false");
  form.append("file", new Blob([new Uint8Array(data)], { type: opts.mimeType }), opts.filePath.split(/[\\/]/).pop() || "audio");

  const response = await (opts.fetchImpl ?? fetch)("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": opts.apiKey },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Scribe STT HTTP ${response.status}: ${await readRedactedErrorBody(response, opts.apiKey)}`);
  }

  const result: any = await response.json();
  const text = String(result?.text ?? "");
  if (!text.trim()) throw new Error("Scribe STT returned empty transcript");

  // 官方响应 words[].start / words[].end 单位已是秒（float），直接映射无需换算；
  // timestamps_granularity="word" 下响应可能夹带 spacing / audio_event 条目，只保留 type="word" 的词。
  const rawWords = Array.isArray(result?.words) ? result.words : [];
  const words: Word[] = rawWords
    .filter((w: any) => w?.type === undefined || w.type === "word")
    .map((w: any) => ({ word: String(w?.text ?? w?.word ?? "").trim(), start: Number(w?.start) || 0, end: Number(w?.end) || 0 }))
    .filter((w: Word) => w.word.length > 0);

  const languageFromResponse = typeof result?.language_code === "string" && result.language_code.trim() ? result.language_code : undefined;
  return {
    text,
    words,
    durationSec: Number(result?.audio_duration_secs) || 0,
    language: languageFromResponse ?? languageCode,
    provider: "scribe",
    model: "scribe_v2",
  };
}

/**
 * Cloudflare Workers AI 原生 `@cf/openai/whisper`（Bearer 鉴权 + 原始音频 bytes）。
 * 端点形状与响应信封（`{ success, result }`）与仓内既有 `cfWhisperHandler.ts` 保持一致。
 * 词级时间戳缺失时按「段级 → 整段」逐级 fallback，保证 SRT 生成链路始终有可用时间轴。
 */
export async function transcribeWithCloudflare(opts: {
  apiToken: string; accountId: string; filePath: string; mimeType: string; language?: string;
  fetchImpl?: (input: URL | RequestInfo, init?: BunFetchRequestInit | RequestInit) => Promise<Response>;
}): Promise<SttResult> {
  const data = await readFile(opts.filePath);
  const url = `https://api.cloudflare.com/client/v4/accounts/${opts.accountId}/ai/run/@cf/openai/whisper`;

  const response = await (opts.fetchImpl ?? fetch)(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiToken}`,
      "Content-Type": opts.mimeType,
    },
    body: data,
  });

  if (!response.ok) {
    throw new Error(`Cloudflare Whisper HTTP ${response.status}: ${await readRedactedErrorBody(response, opts.apiToken)}`);
  }

  const payload: any = await response.json();
  if (payload?.success === false) {
    const detail = JSON.stringify(payload?.errors ?? []).slice(0, 1000);
    throw new Error(`Cloudflare Whisper failed: ${redactSecret(detail, opts.apiToken)}`);
  }

  const result: any = payload?.result ?? payload;
  const text = String(result?.text ?? "");
  if (!text.trim()) throw new Error("Cloudflare Whisper returned empty transcript");

  // words[] 的时间戳单位已是秒（与仓内 cfWhisperHandler 的计费推算一致）
  const rawWords = Array.isArray(result?.words) ? result.words : [];
  const rawSegments = Array.isArray(result?.segments) ? result.segments : [];
  let words: Word[] = rawWords.map((w: any) => ({
    word: String(w?.word ?? w?.text ?? "").trim(), start: Number(w?.start) || 0, end: Number(w?.end) || 0,
  })).filter((w: Word) => w.word.length > 0);
  if (!words.length) {
    words = rawSegments.map((s: any) => ({
      word: String(s?.text ?? "").trim(), start: Number(s?.start) || 0, end: Number(s?.end) || 0,
    })).filter((w: Word) => w.word.length > 0);
  }

  const lastEnd = words.length ? words[words.length - 1].end : 0;
  const durationSec = Number(result?.duration) || lastEnd || 0;
  // 无任何时间戳对齐（既无 words 也无 segments）时退化成整段一个词，保持时间轴可用
  if (!words.length) words = [{ word: text.trim(), start: 0, end: durationSec }];

  return {
    text,
    words,
    durationSec,
    language: typeof result?.language === "string" ? result.language : (typeof opts.language === "string" ? opts.language : undefined),
    provider: "cloudflare",
    model: "@cf/openai/whisper",
  };
}

/** 把密钥从任意诊断文本里抹掉（错误信息绝不泄露 token）。 */
function redactSecret(text: string, secret: string): string {
  if (!secret || secret.length < 3) return text;
  return text.split(secret).join("***");
}

const CJK_RE = /[\u3400-\u9fff]/u;
const ALNUM_RE = /^[\p{L}\p{N}]$/u;
const SENTENCE_END_RE = /[。！？.!?\n]$/u;

/** 左侧以这些标点结尾时，后接字母/数字需要空格（`основу,` + `в` → `основу, в`）。 */
const LEFT_TRAILING_PUNCT_RE = /^[,.;:!?)\]}»”"'…—–]$/u;
/** 右侧以这些开头时也视作新词（`слово` + `«цитата»` / `—`）。 */
const RIGHT_LEADING_RE = /^[(\[{«“—–]$/u;

function tokenIsCjk(text: string): boolean { return CJK_RE.test(text); }
function needsSpace(left: string, right: string, leftCjk: boolean, rightCjk: boolean): boolean {
  if (leftCjk || rightCjk) return false;
  const leftLast = Array.from(left.trimEnd()).at(-1) ?? "";
  const rightFirst = Array.from(right.trimStart())[0] ?? "";
  const leftOk = ALNUM_RE.test(leftLast) || LEFT_TRAILING_PUNCT_RE.test(leftLast);
  const rightOk = ALNUM_RE.test(rightFirst) || RIGHT_LEADING_RE.test(rightFirst);
  return leftOk && rightOk;
}

/** 按与字幕相同的规则拼接 STT token（拉丁/西里尔加空格，CJK 不加）。 */
export function joinWordTokens(tokens: string[]): string {
  let text = "";
  let prev = "";
  for (const raw of tokens) {
    const token = raw.trim();
    if (!token) continue;
    if (text && needsSpace(prev, token, tokenIsCjk(prev), tokenIsCjk(token))) text += " ";
    text += token;
    prev = token;
  }
  return text;
}

export function groupWordsIntoCues(words: Word[]): Cue[] {
  const cues: Cue[] = [];
  let text = "";
  let start = 0;
  let end = 0;
  let previous: Word | undefined;
  let previousCjk = false;

  const flush = () => {
    if (text) cues.push({ start, end, text });
    text = "";
    previous = undefined;
    previousCjk = false;
  };

  for (const word of words) {
    const token = word.word.trim();
    if (!token) continue;
    const currentCjk = tokenIsCjk(token);
    if (previous && word.start - previous.end > 0.6) flush();

    const separator = text && previous && needsSpace(previous.word, token, previousCjk, currentCjk) ? " " : "";
    const candidate = text + separator + token;
    const cjk = tokenIsCjk(candidate);
    const maxChars = cjk ? 42 : 84;
    if (text && (word.end - start > 7 || Array.from(candidate).length > maxChars)) flush();

    if (!text) {
      text = token;
      start = word.start;
    } else {
      const addSpace = previous && needsSpace(previous.word, token, previousCjk, currentCjk) ? " " : "";
      text += addSpace + token;
    }
    end = word.end;
    previous = word;
    previousCjk = currentCjk;
    if (SENTENCE_END_RE.test(token)) flush();
  }
  flush();
  return cues;
}

export function buildSrtFromWords(words: Word[]): string {
  if (!words.length) return "";
  return formatSRT(chunkWords(words, 300).flatMap(chunk => groupWordsIntoCues(chunk.words)));
}
