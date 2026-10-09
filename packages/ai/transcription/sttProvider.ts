import { readFile } from "node:fs/promises";
import type { Word, Cue } from "./types";
import { chunkWords } from "./chunk";
import { formatSRT } from "./srt";

export type SttResult = {
  text: string; words: Word[]; durationSec: number; language?: string;
  provider: "grok"; model: "grok-voice-transcribe-2.0"; vadRetried?: boolean;
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
